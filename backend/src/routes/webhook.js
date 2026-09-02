import { Router } from 'express';
import express from 'express';
import { stripe } from '../lib/stripe.js';
import { config } from '../config.js';
import { store } from '../lib/store.js';
import { syncLicenseFromSubscription } from '../lib/sync.js';

export const webhookRouter = Router();

/**
 * POST /api/webhook
 *
 * Stripe's server-to-server notifications. This is the source of truth for
 * license state — never trust the browser's success redirect for provisioning.
 *
 * IMPORTANT: this route needs the RAW request body to verify the signature,
 * so it mounts its own express.raw() parser instead of the global JSON parser.
 */
webhookRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        config.stripeWebhookSecret,
      );
    } catch (err) {
      // Bad signature => reject. Do not leak details.
      return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
    }

    // Idempotency: Stripe retries deliveries, so process each event id once.
    if (!store.markEventProcessed(event.id)) {
      return res.json({ received: true, duplicate: true });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          if (session.mode === 'subscription' && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            const license = await syncLicenseFromSubscription(subscription, {
              email: session.customer_details?.email,
              plan: session.metadata?.plan,
            });
            // Stash the license key on the subscription so it survives even if our
            // store is ever rebuilt, and so support can find it in the Dashboard.
            await stripe.subscriptions.update(subscription.id, {
              metadata: { ...subscription.metadata, license_key: license.license_key },
            });
          }
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          // Covers renewals, plan changes, cancellations, past_due -> active, etc.
          await syncLicenseFromSubscription(event.data.object);
          break;
        }

        default:
          // Unhandled event types are fine — acknowledge so Stripe stops retrying.
          break;
      }

      res.json({ received: true });
    } catch (err) {
      // Return 500 so Stripe retries later; log for debugging.
      console.error(`Error handling webhook ${event.type} (${event.id}):`, err);
      res.status(500).json({ error: 'webhook_handler_failed' });
    }
  },
);

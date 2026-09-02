import { Router } from 'express';
import { stripe } from '../lib/stripe.js';
import { config } from '../config.js';
import { store } from '../lib/store.js';

export const portalRouter = Router();

/**
 * POST /api/portal
 * Body: { license_key: string }  (or { customer_id: string })
 *
 * Returns a Stripe Billing Portal URL so a customer can manage/cancel their
 * subscription and update payment details. Resolves the Stripe customer from
 * the caller's license key so plugins never handle raw customer ids.
 */
portalRouter.post('/portal', async (req, res, next) => {
  try {
    const { license_key: licenseKey, customer_id: customerId } = req.body ?? {};

    let stripeCustomerId = customerId;
    if (!stripeCustomerId && licenseKey) {
      const license = store.getLicenseByKey(licenseKey);
      stripeCustomerId = license?.stripe_customer_id;
    }

    if (!stripeCustomerId) {
      return res.status(404).json({
        error: 'customer_not_found',
        message: 'No Stripe customer found for the provided license key.',
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: config.portalReturnUrl,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

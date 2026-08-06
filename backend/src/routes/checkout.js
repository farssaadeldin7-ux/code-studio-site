import { Router } from 'express';
import { stripe } from '../lib/stripe.js';
import { config } from '../config.js';

export const checkoutRouter = Router();

/**
 * POST /api/checkout
 * Body: { plan: "pro" | "team", email?: string }
 *
 * Creates a Stripe Checkout Session for a subscription and returns its URL.
 * The pricing page / plugin redirects the browser to that URL.
 */
checkoutRouter.post('/checkout', async (req, res, next) => {
  try {
    const { plan, email } = req.body ?? {};

    const priceId = config.plans[plan];
    if (!priceId) {
      return res.status(400).json({
        error: 'invalid_plan',
        message: `Unknown plan "${plan}". Available: ${Object.keys(config.plans).join(', ')}.`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      allow_promotion_codes: true,
      // Carry the plan slug through so the webhook can label the license.
      subscription_data: { metadata: { plan } },
      metadata: { plan },
      success_url: config.successUrl,
      cancel_url: config.cancelUrl,
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    next(err);
  }
});

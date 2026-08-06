import 'dotenv/config';

export { ENTITLED_STATUSES } from './lib/constants.js';

function required(name) {
  const value = process.env[name];
  if (!value || value.includes('replace_me')) {
    // Fail loud at boot rather than at the first Stripe call.
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

// Map of plan slug -> Stripe price id. The slug is what /api/checkout receives
// (e.g. { "plan": "pro" }); the price id is what Stripe actually charges.
function buildPlans() {
  const plans = {};
  if (process.env.STRIPE_PRICE_PRO) plans.pro = process.env.STRIPE_PRICE_PRO;
  if (process.env.STRIPE_PRICE_TEAM) plans.team = process.env.STRIPE_PRICE_TEAM;
  if (Object.keys(plans).length === 0) {
    throw new Error('No plans configured. Set at least STRIPE_PRICE_PRO in your .env.');
  }
  return plans;
}

export const config = {
  port: Number(optional('PORT', '4242')),
  allowedOrigins: optional('ALLOWED_ORIGINS', '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  stripeSecretKey: required('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: required('STRIPE_WEBHOOK_SECRET'),
  plans: buildPlans(),

  successUrl: optional(
    'CHECKOUT_SUCCESS_URL',
    'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
  ),
  cancelUrl: optional('CHECKOUT_CANCEL_URL', 'http://localhost:3000/'),
  portalReturnUrl: optional('PORTAL_RETURN_URL', 'http://localhost:3000/'),

  databasePath: optional('DATABASE_PATH', './data/store.json'),
};

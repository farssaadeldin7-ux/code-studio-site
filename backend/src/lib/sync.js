import { stripe } from './stripe.js';
import { store } from './store.js';
import { generateLicenseKey, buildLicenseRecord } from './license.js';

function toIso(unixSeconds) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

/**
 * Create or update the license tied to a Stripe subscription. This is the single
 * place that turns Stripe state into a license record, so every webhook path
 * (checkout completed, subscription updated, subscription deleted) converges here.
 *
 * Returns the persisted license record.
 */
export async function syncLicenseFromSubscription(subscription, overrides = {}) {
  const existing = store.getLicenseBySubscription(subscription.id);

  const plan =
    overrides.plan ??
    subscription.metadata?.plan ??
    existing?.plan ??
    null;

  // Prefer an email we were handed (from checkout), else keep what we had, else
  // fall back to the customer object.
  let email = overrides.email ?? existing?.email ?? null;
  if (!email && typeof subscription.customer === 'string') {
    try {
      const customer = await stripe.customers.retrieve(subscription.customer);
      if (customer && !customer.deleted) email = customer.email ?? null;
    } catch {
      // Non-fatal: a license without an email is still valid.
    }
  }

  const record = buildLicenseRecord({
    licenseKey: existing?.license_key ?? generateLicenseKey(),
    email,
    plan,
    customerId:
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: toIso(subscription.current_period_end),
    createdAt: existing?.created_at,
  });

  return store.upsertLicense(record);
}

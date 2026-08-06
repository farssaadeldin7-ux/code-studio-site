import { randomBytes } from 'node:crypto';
import { ENTITLED_STATUSES } from './constants.js';

/**
 * Generate a human-friendly, hard-to-guess license key.
 * Format: CS-XXXX-XXXX-XXXX-XXXX  (Crockford base32, ambiguous chars removed).
 */
export function generateLicenseKey() {
  const alphabet = 'ABCDEFGHJKMNPQRSTVWXYZ0123456789'; // no I, L, O, U
  const bytes = randomBytes(16);
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i % 4 === 3 && i !== 15) out += '-';
  }
  return `CS-${out}`;
}

/**
 * Build the record we persist for a license. Derived entirely from Stripe data
 * so it can always be reconstructed from the source of truth.
 */
export function buildLicenseRecord({
  licenseKey,
  email,
  plan,
  customerId,
  subscriptionId,
  status,
  currentPeriodEnd,
  createdAt,
}) {
  const now = new Date().toISOString();
  return {
    license_key: licenseKey,
    email: email ?? null,
    plan: plan ?? null,
    stripe_customer_id: customerId ?? null,
    stripe_subscription_id: subscriptionId ?? null,
    status: status ?? 'incomplete',
    current_period_end: currentPeriodEnd ?? null, // ISO string
    created_at: createdAt ?? now,
    updated_at: now,
  };
}

/**
 * Decide whether a license currently entitles the holder to use the product.
 * A subscription entitles while active/trialing/past_due AND not past its period end.
 */
export function isLicenseValid(license) {
  if (!license) return false;
  if (!ENTITLED_STATUSES.has(license.status)) return false;
  if (license.current_period_end) {
    // Small grace beyond period end is already covered by Stripe's own status,
    // so we simply require the current period not be in the past.
    const end = Date.parse(license.current_period_end);
    if (!Number.isNaN(end) && end < Date.now()) return false;
  }
  return true;
}

/** The shape we expose to plugins — never leak internal Stripe ids by default. */
export function publicLicenseView(license) {
  return {
    valid: isLicenseValid(license),
    plan: license.plan,
    status: license.status,
    current_period_end: license.current_period_end,
  };
}

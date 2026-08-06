import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateLicenseKey,
  buildLicenseRecord,
  isLicenseValid,
  publicLicenseView,
} from '../src/lib/license.js';

test('generateLicenseKey has the CS- prefix and no ambiguous characters', () => {
  const key = generateLicenseKey();
  assert.match(key, /^CS-[A-Z0-9-]+$/);
  assert.ok(!/[ILOU]/.test(key.slice(3)), 'should omit I, L, O, U');
  // CS- + 16 chars + 3 dashes = 22 chars
  assert.equal(key.length, 22);
});

test('generateLicenseKey is unique across many calls', () => {
  const seen = new Set();
  for (let i = 0; i < 1000; i++) seen.add(generateLicenseKey());
  assert.equal(seen.size, 1000);
});

test('isLicenseValid: active subscription in-period is valid', () => {
  const license = buildLicenseRecord({
    licenseKey: 'CS-TEST',
    plan: 'pro',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 86_400_000).toISOString(),
  });
  assert.equal(isLicenseValid(license), true);
});

test('isLicenseValid: canceled subscription is invalid', () => {
  const license = buildLicenseRecord({ licenseKey: 'CS-X', status: 'canceled' });
  assert.equal(isLicenseValid(license), false);
});

test('isLicenseValid: active but past period end is invalid', () => {
  const license = buildLicenseRecord({
    licenseKey: 'CS-Y',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() - 86_400_000).toISOString(),
  });
  assert.equal(isLicenseValid(license), false);
});

test('isLicenseValid: trialing is valid', () => {
  const license = buildLicenseRecord({ licenseKey: 'CS-Z', status: 'trialing' });
  assert.equal(isLicenseValid(license), true);
});

test('publicLicenseView never exposes Stripe ids', () => {
  const license = buildLicenseRecord({
    licenseKey: 'CS-SECRET',
    plan: 'team',
    status: 'active',
    customerId: 'cus_123',
    subscriptionId: 'sub_123',
  });
  const view = publicLicenseView(license);
  assert.deepEqual(Object.keys(view).sort(), [
    'current_period_end',
    'plan',
    'status',
    'valid',
  ]);
  assert.ok(!('stripe_customer_id' in view));
});

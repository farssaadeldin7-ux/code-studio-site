import { Router } from 'express';
import { store } from '../lib/store.js';
import { publicLicenseView } from '../lib/license.js';

export const licenseRouter = Router();

/**
 * POST /api/license/verify
 * Body: { license_key: string }
 *
 * The endpoint every Code Studio plugin calls to confirm a paying customer.
 * Returns { valid, plan, status, current_period_end } — no internal Stripe ids.
 */
licenseRouter.post('/license/verify', (req, res) => {
  const { license_key: licenseKey } = req.body ?? {};
  if (!licenseKey || typeof licenseKey !== 'string') {
    return res.status(400).json({ error: 'missing_license_key' });
  }

  const license = store.getLicenseByKey(licenseKey.trim());
  if (!license) {
    return res.status(404).json({ valid: false, error: 'license_not_found' });
  }

  res.json(publicLicenseView(license));
});

/**
 * GET /api/license/:key
 * Convenience read-only endpoint (same payload as verify) for quick checks.
 */
licenseRouter.get('/license/:key', (req, res) => {
  const license = store.getLicenseByKey(req.params.key.trim());
  if (!license) {
    return res.status(404).json({ valid: false, error: 'license_not_found' });
  }
  res.json(publicLicenseView(license));
});

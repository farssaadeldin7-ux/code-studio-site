import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';

/**
 * A tiny JSON-file-backed data store.
 *
 * It intentionally has a narrow interface (licenses + processed webhook events)
 * so it can be swapped for Postgres/SQLite/Redis in production without touching
 * the routes. Everything is kept in memory and flushed to disk on every write,
 * which is fine for the low write volume of a plugin licensing backend.
 *
 * Concurrency note: this is single-process only. For multiple instances behind a
 * load balancer, replace this module with a real database.
 */

const path = config.databasePath;

function emptyState() {
  return {
    // license_key -> license record
    licenses: {},
    // stripe_subscription_id -> license_key  (index for webhook lookups)
    subscriptionIndex: {},
    // stripe event id -> true  (idempotency guard for webhooks)
    processedEvents: {},
  };
}

function load() {
  if (!existsSync(path)) return emptyState();
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return { ...emptyState(), ...parsed };
  } catch (err) {
    throw new Error(`Failed to read data store at ${path}: ${err.message}`);
  }
}

let state = load();

function persist() {
  const dir = dirname(path);
  if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(state, null, 2));
}

export const store = {
  /** Insert or replace a license record, keyed by its license_key. */
  upsertLicense(license) {
    state.licenses[license.license_key] = license;
    if (license.stripe_subscription_id) {
      state.subscriptionIndex[license.stripe_subscription_id] = license.license_key;
    }
    persist();
    return license;
  },

  getLicenseByKey(key) {
    return state.licenses[key] ?? null;
  },

  getLicenseBySubscription(subscriptionId) {
    const key = state.subscriptionIndex[subscriptionId];
    return key ? (state.licenses[key] ?? null) : null;
  },

  getLicenseByCustomer(customerId) {
    return (
      Object.values(state.licenses).find((l) => l.stripe_customer_id === customerId) ?? null
    );
  },

  /** Returns true the first time an event id is seen, false on replays. */
  markEventProcessed(eventId) {
    if (state.processedEvents[eventId]) return false;
    state.processedEvents[eventId] = true;
    persist();
    return true;
  },

  /** Test/maintenance helper: wipe everything. */
  _reset() {
    state = emptyState();
    persist();
  },
};

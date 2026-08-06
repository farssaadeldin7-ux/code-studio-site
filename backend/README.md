# Code Studio — Stripe backend

A small **Node.js + Express** service that sells **Code Studio** subscriptions
through Stripe and issues a **license key** each plugin (WordPress, VS Code, CLI,
JetBrains, Chrome) can verify.

The plugins stay bring-your-own-key for the Anthropic call — this backend only
handles **billing and entitlement**. Nothing here ever sees the user's code or
their Anthropic key.

## How it fits together

```
 Pricing page / plugin              This backend                    Stripe
 ─────────────────────              ────────────                    ──────
  POST /api/checkout      ───────▶  create Checkout Session  ─────▶  hosted checkout
        ◀───────────────  { url }                                    (customer pays)
                                                                          │
  webhook  ◀────────────────────────────────────────────────  checkout.session.completed
                                    issue license key,               subscription.updated
                                    persist { key, status,           subscription.deleted
                                      plan, period_end }
  plugin startup
  POST /api/license/verify ──────▶  look up key  ──────────▶  { valid, plan, status }
```

Stripe is the source of truth. Licenses are (re)built from subscription events,
so the store can always be rebuilt by replaying webhooks.

## Endpoints

| Method | Path                  | Purpose                                                        |
| ------ | --------------------- | ------------------------------------------------------------- |
| `GET`  | `/health`             | Liveness check.                                               |
| `POST` | `/api/checkout`       | Create a subscription Checkout Session. Body: `{ plan, email? }`. Returns `{ url }`. |
| `POST` | `/api/webhook`        | Stripe webhook (raw body, signature-verified). Provisions/updates licenses. |
| `POST` | `/api/license/verify` | Verify a key. Body: `{ license_key }`. Returns `{ valid, plan, status, current_period_end }`. |
| `GET`  | `/api/license/:key`   | Same payload as verify, for quick checks.                     |
| `POST` | `/api/portal`         | Billing-portal URL for self-service management. Body: `{ license_key }`. Returns `{ url }`. |

`plan` is a slug (`pro`, `team`) mapped to a Stripe price id in your `.env`.

## Setup

```bash
cd backend
cp .env.example .env      # fill in your Stripe keys + price ids
npm install
npm start                 # or: npm run dev  (auto-reload)
```

### 1. Create products & prices in Stripe

In the [Stripe Dashboard](https://dashboard.stripe.com/products) create a
recurring price for each plan, then put the price ids in `.env`:

```
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEAM=price_...
```

### 2. Wire up the webhook

Local development with the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:4242/api/webhook
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET
stripe trigger checkout.session.completed   # optional: fire a test event
```

In production, add an endpoint at `https://your-host/api/webhook` subscribed to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Verifying a license from a plugin

Each plugin calls `verify` once at startup (and caches the result briefly):

```js
const res = await fetch('https://your-host/api/license/verify', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ license_key: userKey }),
});
const { valid, plan } = await res.json();
if (!valid) {
  // prompt the user to subscribe / renew
}
```

## Storage

Ships with a zero-dependency JSON-file store (`src/lib/store.js`,
`data/store.json`) — fine for a single instance and low write volume. For
multiple instances or higher scale, replace that one module with Postgres/SQLite:
the routes only use `upsertLicense`, `getLicenseByKey`, `getLicenseBySubscription`,
`getLicenseByCustomer`, and `markEventProcessed`.

## Environment variables

| Variable                | Required | Description                                             |
| ----------------------- | -------- | ------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | ✅       | `sk_test_...` / `sk_live_...`                           |
| `STRIPE_WEBHOOK_SECRET` | ✅       | `whsec_...` from the CLI or Dashboard endpoint          |
| `STRIPE_PRICE_PRO`      | ✅       | Price id for the `pro` plan (at least one price needed) |
| `STRIPE_PRICE_TEAM`     | –        | Price id for the `team` plan                            |
| `PORT`                  | –        | Default `4242`                                          |
| `ALLOWED_ORIGINS`       | –        | Comma-separated CORS allowlist (`*` for local dev)      |
| `CHECKOUT_SUCCESS_URL`  | –        | Redirect after payment (`{CHECKOUT_SESSION_ID}` allowed)|
| `CHECKOUT_CANCEL_URL`   | –        | Redirect if checkout is abandoned                       |
| `PORTAL_RETURN_URL`     | –        | Where the billing portal returns the customer           |
| `DATABASE_PATH`         | –        | JSON store path (default `./data/store.json`)           |

## Tests

```bash
npm test
```

Covers license-key generation (uniqueness, format) and entitlement logic
(active/trialing valid; canceled/expired invalid; no Stripe ids leaked).

## Security notes

- The webhook verifies Stripe's signature and is idempotent (each event id is
  processed once), so retries and replays are safe.
- Provisioning happens **only** from webhooks — never from the browser's success
  redirect, which can be forged.
- `verify` returns entitlement fields only; internal Stripe customer/subscription
  ids are never exposed to plugins.

import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { webhookRouter } from './routes/webhook.js';
import { checkoutRouter } from './routes/checkout.js';
import { portalRouter } from './routes/portal.js';
import { licenseRouter } from './routes/license.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  const corsOptions = {
    origin: config.allowedOrigins.includes('*') ? true : config.allowedOrigins,
  };
  app.use(cors(corsOptions));

  // The webhook MUST see the raw body for signature verification, so it is
  // mounted BEFORE the global JSON parser. Its own express.raw() runs first.
  app.use('/api', webhookRouter);

  // Everything else is JSON.
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'code-studio-backend' }));

  app.use('/api', checkoutRouter);
  app.use('/api', portalRouter);
  app.use('/api', licenseRouter);

  // 404
  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', path: req.path });
  });

  // Central error handler. Stripe errors carry a statusCode we can surface.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.statusCode || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
      error: err.type || 'internal_error',
      message: err.message || 'Something went wrong.',
    });
  });

  return app;
}

// Only start listening when run directly (not when imported by tests).
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Code Studio backend listening on http://localhost:${config.port}`);
    console.log(`Plans: ${Object.keys(config.plans).join(', ')}`);
  });
}

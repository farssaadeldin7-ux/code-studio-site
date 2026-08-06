import Stripe from 'stripe';
import { config } from '../config.js';

// A single shared Stripe client. Pin the API version so upgrades are deliberate.
export const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2024-12-18.acacia',
  appInfo: {
    name: 'Code Studio Backend',
    url: 'https://github.com/farssaadeldin7-ux/code-studio-plugin',
  },
});

// Statuses Stripe reports for a subscription that entitles the customer to use
// the product. Kept dependency-free so licensing logic is testable in isolation.
export const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due']);

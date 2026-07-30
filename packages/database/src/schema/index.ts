/**
 * Drizzle schema root.
 *
 * Intentionally empty. VeriPay's business tables (users, deals, payments,
 * payouts, webhook events) are not part of the scaffold and land here as the
 * corresponding features are built.
 *
 * When adding a table:
 *   1. Define it in its own module under `src/schema/` and re-export it here.
 *   2. Store every monetary amount as an integer minor-unit column
 *      (`integer` or `bigint`) — never `numeric`, never a float.
 *   3. Run `npm run db:generate` to produce SQL, review the generated file,
 *      then `npm run db:migrate` to apply it.
 */

export {};

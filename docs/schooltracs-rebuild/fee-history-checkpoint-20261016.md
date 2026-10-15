# Fee recorded-edit reader — 2026-10-16

Scope: a read-only source for the Fee details UI, under Goal v2.5 §8.1. This is recorded edit history, not future effective-price periods. No price scheduling, backdating policy, order repricing, database migration or write path is added.

- `GET /api/fees/:id/history` requires an authenticated administrator before ID decoding or existence lookup. Teacher/Student are denied; absent session, malformed ID, unknown Fee and unsupported methods remain distinct. Existing OPTIONS preflight remains unchanged.
- Query exactly one Fee ID, ordered by audit insertion ID descending. Return only Fee ID plus record ID/version/action/time, the captured Fee name and pricing facts, and a readable actor name from the existing user relation when available.
- Never return raw audit snapshots, email/credentials or unrelated Fee records. Malformed/missing snapshot values stay unknown; they are not reconstructed from the current Fee. Known nonnegative recorded prices, including zero, remain facts.
- SDK `feeHistory(id)` retains the existing request/session supersession behavior.

Validation: maker targeted server/SDK/Fee regressions 51/51; independent reviewer reran the five formal HTTP tests using temporary databases. All use isolated fixtures. The combined exact-index candidate with its UI consumer passed `npm test --prefix sample` (1452/1452, no skips; 78.028s) and `npm run build --prefix sample` (13.92s). Existing SQLite experimental and Vite large-chunk warnings remain; these results do not certify performance or the whole Goal.

Local runtime: original service restarted on 127.0.0.1:5180 with its original database and accounts; anonymous history request returns 401. Admin real UI read existing Fee history successfully. Before subsequent role sign-in testing, all 42 tables in both original and isolated GUI databases were identical to their pre-slice snapshots. No current/future pricing write was performed.

UI integration, source comparison, actual browser evidence and remaining limitations are recorded separately in the Fee UI checkpoint. No real payment, external messaging, deployment or push is implied.

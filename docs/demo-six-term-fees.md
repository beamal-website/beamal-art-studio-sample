# Six four-lesson sample fees

The explicit local helper `sample/server/simplify-demo-fees.mjs` replaces the fee catalogue of the completed, owned 25-student demo. It is never run by normal startup.

Supply a JSON array in Course 1–6 order, each entry containing `id` (course ID), `feeId` (one existing fee belonging to that course), and `priceCents` (four-lesson term price). This instance uses HK$1,000 / 1,200 / 1,500 / 1,200 / 168 / 1,200, retaining the previous package prices or multiplying the single-lesson price by four.

Run with `node sample/server/simplify-demo-fees.mjs --database /absolute/sample.sqlite --plan /absolute/plan.json --backup /absolute/new-backup.sqlite`. The helper verifies the completed demo marker, its 25 student identities, all order course IDs, and the exact six-course plan. It makes a separate SQLite backup before a single transaction changes current course/fee associations, pricing, current order snapshots and payment totals. Obsolete fee definitions and their dependent package components are removed. A completion marker makes reruns unchanged; old audit history for retained entities remains available, with an explicit new audit entry describing the conversion.

Student identities, class assignments, attendance, lesson records and approved reschedules are preserved. A four-visit package may have fewer than four selected lesson dates; its unarranged balance remains visible rather than inventing additional attendance. No new payment or external charge is performed. Accounting invoices, receipts, reports and family payment views derive from the same updated orders and enrollment sales.

Products remains a page with its search and stock views. The four built-in sample products and their linked sample invoice line were removed from the application's default dataset. Explicit component-test product fixtures live only in `sample/tests/fixtures/product-component-data.mjs` and are not imported by application code. There is no persisted product table in this local SQLite database; no real product or product sale is removed.

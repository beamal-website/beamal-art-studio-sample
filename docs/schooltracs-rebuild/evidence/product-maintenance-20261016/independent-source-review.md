# Product Stage A independent read-only review
2026-10-16. Frozen production files reviewed; no repo, browser, DB, Git index, commit, full suite or build changes.

## Result
**No new release-blocking defect found in the bounded Product UI slice.** Independent outcome tests: **10/10 PASS**, `/tmp/beamal-products-independent-current.log`; test file `/tmp/beamal-products-independent-current.mjs`.

The first independent run was 6/10 because my harness had not filtered to visible product21 and compared the deliberately partial input `data` object against the full operations envelope. These were tester bindings, not product defects; `/tmp/beamal-products-independent-initial-harness.log` retained. Assertions on Product source immutability, raw values, exact identity and no success were retained.

## Proven boundaries
- Exact missing/duplicate ID fails closed, with no same-name record borrowing or blank Create fallback (`operations-ui.js:62,270–274,486–491`).
- Only one product language name + Price required; Code, other name, inventory/category/status/cost/location/detail/remark can remain blank. Raw spaces/newlines/leading zeros survive Review/Back; literal HTML escaped (`:48–80,289–301,497–505`).
- Decimal precision is checked before review: exponent/sub-cent/unsafe or visibly rounded money rejected while raw input stays editable; 0/.01/.29/leading-zero decimal accepted (`:71–79`). This is a technical representability check, not a price policy.
- Stock adjustment is now **draft → Review → Back/Cancel**, including exact reason, old quantity/result and safe whole-number bounds. Existing source quantities unchanged; final Save disabled, forged final commands have no success notice or mutation (`:84–98,275–287,433–440,507–514`).
- Real controller with native-shaped actual-markup fields preserves text/caret/selection direction/textarea scroll/body scroll through review/back. Temporary same-identity errors update the status without remounting the focused field; review disabled until valid recovery (`interface-preview.js:44–80,492–545`).
- Same-ID canonical changes latch stale guard even if a later snapshot returns the old values (`interface-preview.js:64–69`).
- Identity/role/route invalidation removes old private draft before forged action; Teacher/Student cannot use Admin Product actions in shared mode (`interface-preview.js:25–47,665`).
- Explicit loading/error/unavailable/malformed source does not fall back to the four fixtures; true empty and no-match remain distinct (`operations-ui.js:122–126`; controller:49–63).
- CSS bounded dialog/body/footer/mobile spacing and focusable scroll body are present (`operations-ui.css:70–93`). **No actual browser layout or native Tab success is claimed by this reviewer**; Root owns real GUI checks.

## Source alignment and remaining scope
- Original PDF p9 Create product has Name*, Code, Category, Price*, Tax, Unit cost, Quantity, Location, Detail, Remark, Online Store and photo area. Current useful maintenance core aligns with the bounded task; requiring two language names or Code is correctly avoided.
- PDF p8 Product Details & Course Payment Summary is a Reports table, not an inventory source; current code does not manufacture report sales from stock.
- Historical SchoolTracs Products Overview / Manage stock observation is recorded in `docs/schooltracs-rebuild/v2-ui-navigation-checkpoint.md:146–153`. It is historical, not fresh live evidence. My latest Chrome research was blocked before DOM (`/tmp/beamal-products-schooltracs-observation-20261016.md`), so successful source saves/edit records remain unobserved.
- `src.js:2516` still supplies no real Product source/API; host intentionally retains the existing four presentation products when no productsContext ever supplied (`interface-preview.js:21,49–53`). This passes UI-only scope, **not shared business persistence or real catalog completion**.
- Current Product create/edit/stock final saves are deliberately disabled. No Product HTTP/API integration, stock-order ledger (Receive/Transfer/Use), product-to-real-order integration or tax/discount/refund policy was implemented or certified here. These remain main functionality, not automatically minor exclusions.
- Supplied Tax/Online Store/photo metadata is read-only; no new publication/upload behavior is claimed (`operations-ui.js:261–263`).
- Future source adapter should provide a user-safe error message: `productsContext.error` is escaped but displayed verbatim (`interface-preview.js:61,75`; operations UI source messages). No live Product adapter exists now; no real raw server diagnostic leak was observed.

## Frozen file SHA256
- operations-ui.js b437c21b272cd68756a5c99a72c278441b89ec8594344476b8e38f98ead3b917
- operations-ui.css 62e2ae047a4fca7a6cd441b3e0cc81771d7ae2459ad732f7e8235e47af82107a
- interface-preview.js 9261e89434aa30ccb8b862d6c664822fd6829223b8810721941474fb90453a5f
- src.js 183f25bd18a5bb15999c432a702d85256867b900d2dc93494d081e5ff71c0647

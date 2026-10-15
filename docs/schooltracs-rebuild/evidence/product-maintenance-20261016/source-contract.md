# Products — next coherent Stage A slice
2026-10-16. Files-only research; no code/Git/DB/browser changes. PDF p8 freshly rendered and fully viewed; p9 reopened from the verified original. No fresh SchoolTracs inspection is claimed.

## Source map
| Source | Confirmed direction | Limit |
|---|---|---|
| Original PDF p9 lower half | “New product add & Different Discount”; actual Create product screenshot: Name*, Code, Category, Price*, Tax, Unit cost, Quantity, Location, Detail, Remark, Display in Online Store, photo area; background Overview / Manage stock | Candidate fields are not a complete tax, stock ledger, publication or discount policy. Do not impose two mandatory language names/SKU because the screenshot has one Name*. |
| Original PDF p8 | Product Details & Course Payment Summary; Report/Product Summary with Date Range, From/To, Branch, Product Name/Category/Quantity/Total | This is reports, not the catalog Product detail dialog. Defer its figures/query semantics to Reports slice; do not mix sales quantity with current stock. |
| Goal:88,238,301–303 | Products follows Course+Fee+TT; list/category/query/detail/create/edit/prices and verified stock; Code/Category/Price/Quantity/Location important | No permanent Stage A disable-as-complete; final business writes belong later. Tax/UnitCost/store/photo/deepstock require source decisions. |
| Notion source:413–425, register O-01 | Products can be non-course order items; same order/payment/history chain | No independent Product maintenance requirement ID; don't invent one or imply current enrollment-only API already accepts Products. |
| PDF comparison:129–130,153,170 | Product maintenance separate from choosing items in a bill; product, order, individual, referral and Coupon discounts distinguishable | No automatic percentage, stacking, tax or refund formula. |
| Durable SchoolTracs observation: v2-ui-navigation-checkpoint.md:146–153 (2026-10-15) | Overview had Normal/Search/Category and Code/Name/Detail/Remark/Online Store/Created date headers; separate Manage stock has stock-orders list, Type/Status/Transfer/Receive | Source account had0products: no observed existing-item detail/edit behavior, sorting result, pagination result or successful save. This is historical evidence, not this-turn live. |

Original PDF path: /Users/yausiuhei/Downloads/Beamal web & app rough brainstorm remark (eileen.pdf.
Verified SHA in preceding source research: ffffe3efea424f501c13172e7ea9d80056a041158f3d4ed1e969de64b5d3a55e. p8 render: /tmp/beamal-products-source-pdf/page-8.png; p9: /tmp/beamal-course-content-source-pdf/page-9.png.

## Current code: preserve what already works
- operations-ui.js:6–10 supplies4natural product fixtures; :28–29 dataFor defaults to these; interface-preview.js:16–20 explicitly separates them from shared business records.
- operations-ui.js:48–72 already has name/SKU search, status/category filters, five-column numeric/text sorting,10/20/50page sizes, counters and bounded paging; operations-ui.css:60–70 supplies responsive list controls.
- Product detail/edit/stock in operations-ui.js:203; returnTo exact product parent at:329–331,374–375. Existing tests cover detail→edit/stock→Cancel/X/Escape, direct-list edit→list, stock validation and list sort/paging.
- src.js around:2362 reaches operations Products on real account page for Admin/internal manager path; ordinary scoped Teacher menu at:332 does not grant this workspace. Do not broaden roles.
- No Products service route/SDK operation was found in server/app.mjs or client/api-client.js. “Save” currently updates only copied preview data (:380–384), with an explicit no-live-save notice; not server persistence.

## Concrete main gaps (code evidence, not runtime claims)
1. Product forms/details lack separate Location and Remark fields; no explicit Review→Back stage. Metadata is thinner than source's useful core. Detail conflates descriptions with all notes.
2. productDialog(:203) falls back to a blank new-product object even when an existing requestedID is unknown; current currency(:3) coerces unavailable/invalid amounts toHK$0.00. Exact existing identity and unknown values need fail-closed handling.
3. Read/loading/error/trueempty/no-match are not separate Product source states; missing data falls back to4fixtures (:29), while:71 always reports counts. Any future shared source must not silently borrow this dataset.
4. Create requires both language names,SKU,stock and reorder threshold (:382) despite narrower source required markers. Categories default to materials, stock0/threshold4/statusdraft (:203); some are demo decisions, not confirmed universal policies.
5. Preview submit directly mutates copied products and returns detail (:384); there is no final review of the exact target/draft. All stock changes are local preview; do not infer a Receive/Transfer/Use stock-order policy from that existing form.
6. Separate product discounts from pricing and from Coupon/order/referral rules; no complete product-discount contract exists. Do not add an arbitrary discount% default just to match the handwriting.
7. No current live browser proof this turn; old UI evidence cannot certify today's long forms, missing states, mobile or focus.

## Recommended next task: one complete Product maintenance UI path
**Actual account Products list → exact Product detail → Edit / Create → Review → Back / Cancel → same detail/list context.** Reuse the existing list and proven return contract; no wholesale redesign and no new backend in this slice.

Scope / fields:
- Core product identity/name (one name sufficient; optional other-language translation), Code/SKU, Category, selling price, Quantity, Location, separate Detail and Remark.
- Show supplied Cost/store/tax/photo information honestly if available; do not manufacture a tax option, image, upload pipeline or publication state. Keep existing Beamal images unchanged.
- Preserve existing Status/reorder display when present; don't treat those demo defaults as required business fields. Unknown numeric values stayunknown; explicit0 stays0.
- Admin prepares a draft for the exact existing productID (or explicit Create). Teacher/Student scope remains unchanged/read-only or unavailable; display access does not imply edit permission.
- Localized form labels, optional fields, numeric/duplicate-Code checks against only the provided dataset, error on exact missing/duplicateID; no fallback by name or first product.
- Submit means Review, not persistence. Review shows the same draft, target and any unchanged values; Back retains raw typed data. Final business Save/Create disabled with a short natural explanation. Forged final commands change no source records.
- Detail Close restores original filtered/sorted/page list and opener/scroll; edit Cancel/X/Escape restores original exact detail if opened there; direct-list edit andCreate Cancel returnlist. Identity/navigation/source invalidation clears private drafts; same identity read failure preserves editable draft and honest error.
- Retain one bounded scroll body, visible header/footer,44px controls and keyboard body focus at390/768/1280. No redundant Products subtitle.

Acceptance:
1. Non-first Product and same-name/different-ID isolation; unknown/duplicateID never blank-created.
2.27+products across sort/filter/pages, clear/no-match vs trueempty vs unavailable, no source mutation.
3. Optional translation/Code/Location/Remark blanks are not forced into unrelated defaults;0vs unknown safe.
4. Native input/change/IME, edit→review→back, errors, Escape/X/Cancel, focus/caret/scroll and list state.
5. Slow source/role/navigation responses cannot reopen another product; no saved success or shared persistence claimed.
6. Bilingual/XSS/long content and real browser checks; don't count pure markup tests as runtime completion.

## Explicitly outside this single slice
- New stock-orders/Transfer/Receive ledger, valuation, stock reservation or auto-deduct-on-payment; existing preview stock path should be retained safely, not expanded into assumed business behavior.
- Tax/discount/refund calculations; automatic product promotion or account-wideCoupon logic.
- Product sales/report totals, accounting reconciliation, real publicstore publication and photo upload limits.
- Product→formal non-course order service integration (important future work, not minor); current enrollment orders require courseId+feeId+lessons.

After this coherent Product UI passes, follow Goal's Students main flow. Do not keep polishing every hypothetical stock/tax detail before advancing.

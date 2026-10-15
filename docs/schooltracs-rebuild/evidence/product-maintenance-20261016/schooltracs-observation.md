# SchoolTracs Products — attempted live observation
Date: 2026-10-16 (Hong Kong). Read-only research; no production/repo/DB/Git/IAB operations.

## What was freshly observed
- Selected Chrome through the documented CUA browser entry and named this research session “Products reference.”
- Browser user-tab inventory returned an existing tab titled “Sales - SchoolTracs” at the SchoolTracs /v4/web/sales/courses route.
- No other tab was opened or operated. Unrelated user tabs were not inspected further.
- This tab title/URL proves only that the reference tab exists; it does not prove current login is still valid.

## Blocker and bounded recovery
- Claiming the existing SchoolTracs tab timed out during the browser's focus-emulation connection step, before a DOM snapshot could be read.
- Read the documented browser-troubleshooting guide.
- One attempt to obtain/read the same tab through the existing selected browser's documented tabs API failed at the same connection step.
- Stopped after that bounded recovery attempt; did not reselect another browser, create a new tab, use another automation mechanism, reload, log in, enter credentials or reset anything.

## Not observed this turn
- Current SchoolTracs authentication status.
- Products Overview, Create product fields or required markers, initial form focus, Cancel return focus, Manage Stock headers.
- No UI result or successful Save is inferred from the tab title or from old screenshots.

## Existing evidence remains historical/source-only
The files-only contract /tmp/beamal-products-stage-a-next-contract.md remains valid as a source map, with its stated boundaries:
- Original PDF p9 shows a Create product screenshot with Name* / Price* and Code / Category / Tax / Unit cost / Quantity / Location / Detail / Remark / Online Store / photo area.
- v2-ui-navigation-checkpoint.md:146–153 records an earlier SchoolTracs Products Overview and separate Manage stock stock-orders list, but the reference had0products then.
These are not relabelled as fresh live observations. Existing-item detail/edit/save behavior is still unknown; tax/stock/discount rules are not inferred.

## Cleanup
No navigation or input reached the reference page, no tabs were created, no data/configuration changed. The user tab was not intentionally moved away from its original Sales page. A current DOM/screenshot could not be obtained, so its on-screen state is not claimed verified.

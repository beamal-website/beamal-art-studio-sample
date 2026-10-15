# Products Stage A independent acceptance — final v2

Verdict: PASS within the defined Stage A UI scope. No unresolved blocking finding in the reviewed source. This does not declare the whole Goal complete, real Product/stock saving available, or a live visual acceptance by this reviewer.

## Scope and immutable source

Reviewed HEAD 75c061e5ac5cdb61ce8adf6143835eb3e65a06a9 plus the current Products working-tree slice. Ten production/test source files were copied byte-for-byte into /tmp/beamal-products-independent-final-v2-20261016 and hashed in /tmp/beamal-products-independent-final-v2-manifest.json. The previous 37-case manifest remains immutable historical evidence and is superseded. Repository files were not changed by this reviewer. No database, browser, Git mutation, full test suite or build was used.

## Independent results

- Product native-shaped controller and DOM: 12/12 PASS.
- Product pure renderer/reducer semantics: 10/10 PASS.
- Source failure/change during Chinese composition: 2/2 PASS.
- Stock Edit → Review → Back/Cancel and source/identity boundaries: 8/8 PASS.
- Exact-money technical precision, including normal .5 / 0.29 / 0.00: 5/5 PASS.
- Render-teardown focusout/unchanged-read regression: 2/2 PASS.
- Total: 39/39 PASS. All six commands exited 0; log paths and test-script hashes are in the v2 manifest.
- Scoped git diff --check completed without errors.

The stock identity/navigation test snapshots the original form fields before discarding the owner, then submits that actual old payload. It cannot pass merely because a mutable fixture getter becomes empty.

## Proven regressions resolved

The initial immutable Product baseline gave 1 PASS and 4 RED: unknown IDs became blank Create, unknown numeric facts became zero, optional single-language/name/Code rules were wrong, and submitting directly changed the presentation dataset with an updated claim. The separate original controller composition-Escape test was RED.

The later source/IME boundary produced 0/2 RED: source error or changed price replaced the composing textarea before the IME guard. The final source updates only the existing status banner and submit-disabled property, and updates the serialized modal cache without replacing the form. Both final tests require the original field to remain connected, retain focus/caret/scroll/raw text, visibly show the source warning and disable Review.

The stock immutable baseline produced 1/8 PASS and 7 RED. A provided stock0 → add2 originally kept stock0 visible but announced Stock preview updated. The confirmed final contract applies the same unsaved stock Review to both explicit sources and omitted-source fixtures. Current stock, adjustment quantity/direction and proposed result are separate facts; final Save is disabled. No data.products mutation or updated/saved success is produced. Invalid directions, unsafe/negative/fractional/zero quantities and removing more than known stock are rejected while preserving draft input.

Two first-run controller failures were fixture calibration, not product bugs: the provider's already-translated Read failed message was excluded by an incomplete regex, and an editor X correctly used cancel-product rather than a detail close command. Corrections follow the rendered DOM and keep the error-state/no-fallback and exact-return assertions.

## Final GUI-discovered validation error regression

Root independently discovered in a real 390px browser that rejected money input stayed in the editor but its explanation disappeared. This reviewer did not operate that browser. A new /tmp native-shaped lifecycle hook models repaint detaching the active old field and firing focusout while the controller redraws. Against the earlier immutable source, both explicit-provider and omitted-provider cases failed 0/2; current source passes 2/2. The tests require the inline error, unchanged raw price and Remark, fresh focused price control and selection direction, followed by an unchanged read that retains the error. Actual changed 12.50 input must still progress to unsaved Review. Logs: /tmp/beamal-products-independent-focusout-{red,green}.log.

The source fix uses a try/finally controlled-render guard to ignore the outgoing control event, and preserves validation error by default when merely harvesting the current form. Only a target whose raw value actually differs from the stored draft clears the previous error. The original 37 cases were rerun on this source and remain green. Root’s permanent lifecycle regression and helper retain their assertions; no old success result was relabelled as evidence for the changed source.

## Five-axis review

1. Correctness: exact nonfirst and same-name product IDs remain distinct. Explicit empty, unavailable, loading and error sources never borrow the four presentation fixtures. Known zero differs from unknown. Review/Back preserves raw text, selection direction, body scroll and textarea scroll. Cancel restores the exact detail action and list opener/query/page/table position. Source drift blocks Review; missing/ambiguous records and changed identity/role/workspace invalidate the old owner and old submit.
2. Simplicity/readability: product drafts and stock drafts have separate small reducers, while one bounded product shell and return helpers cover the common flow. No new dependency or general persistence abstraction was introduced. The existing dense host module remains a maintenance consideration, not a new blocker in this bounded change.
3. Architecture: productsContext is an explicit synchronous read-source boundary. An omitted provider retains named presentation fixtures; null/invalid/nonready providers do not fall back. Drafts and source records remain separate, and cacheModal updates only serialized modal state. Future authoritative Product/stock APIs remain separate work.
4. Privacy/security: shared Admin identity is required; forged shared Teacher/Student entries are blocked. Owner keys include identity/role/workspace. Names, Code, location, Detail, Remark, stock reason and provider error text are escaped in renderer output. Forged final submits do not write records. No API call, storage write, real account or business-data mutation was introduced by this slice.
5. Performance: pagination remains 10/20/50 with unchanged page/focus coverage, now supplied directly by an explicit 27-record source rather than using Create as a hidden fixture mutator. Unchanged-source refresh does not remount the editing form. No per-product network requests or N+1 requests were introduced. The provider clone/HTML comparison is synchronous and was exercised with 27 records; no large-catalogue benchmark or latency guarantee is claimed.

## Formal regression review

Read sample/tests/product-maintenance-interactions.test.mjs and its relative-path helper. The two composition cases retain original-node, zero-remount, warning and disabled-submit assertions. The stock case retains immutable source, zero review scroll, selection direction/own scroll, raw Back content and exact parent return. Existing creation/edit/stock tests now assert unsaved Review with unchanged source instead of the removed fake local mutation. The pagination fixture uses 27 explicit records; page and focus assertions were not removed. These existing changes match the newly confirmed UI contract rather than loosening expectations to hide a failure.

## Evidence limits and unfinished work

This reviewer did not operate the live UI or inspect final screenshots in this task. DOM models do not prove native input-method candidate-window behaviour, pixel layout, touch targets or all browser keyboard behaviours. Root owns the actual GUI and full-suite/build verification; those are separate evidence.

The provider is synchronous. Context/owner invalidation was tested, not an asynchronous Product network race. Real Product creation/editing, stock persistence/ledger, file/photo publication and related business integrations remain unfinished Stage B work. Final disabled saves are intentional and are not counted as implemented persistence. No successful booking/payment/enrolment claim is made.

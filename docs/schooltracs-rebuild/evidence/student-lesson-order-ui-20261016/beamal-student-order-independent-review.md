# Student My classes → exact lesson order: independent acceptance

Date: 2026-10-16. Base HEAD: b573f917834db105d3c4360151d7bb07b71d022c, test branch. Result: **PASS for this scoped read-only UI slice; no outstanding blocking finding.** This is not completion of the overall Goal.

## Evidence and ownership

- Independently executed **34/34 targeted tests**, 0 failed: `/tmp/beamal-student-order-independent-final.log` (424 ms). Composition: original baseline 2 + full-source VM host 16 + busy/read-error 7 + new repository host regressions 9. Some cases deliberately overlap as durable regression coverage; 34 is an executed test total, not 34 unique product features.
- New sole-owned repository file: `sample/tests/student-lesson-order-host.test.mjs` (56 lines, 9 cases). Uses relative source reads/imports and extracts actual production functions; no `/tmp` imports or machine-specific dependencies. Syntax and trailing-whitespace checks passed. No other repository file was written by this reviewer in this task.
- No browser, real DB, business mutation, full suite/build, commit, push, or Git-index operation by this reviewer. Parent handles live GUI, full tests/build and release checks; their results are not counted as reviewer-run evidence.
- Exact seven-file SHA-256 manifest: `/tmp/beamal-student-order-independent-manifest.json`. Final src SHA-256: `744ebac2eaa9cd8d8c30ecead5f9c432190201b15de71b41e1320be1da652f4f`. New host-test SHA-256: `41be3bb8e781160217df5b95749c56889102d2e42d45fbb6678d71bed26d5093`.

## Genuine RED evidence retained

1. Before production implementation, real My classes markup lacked a session-bound order action and host lacked `openStudentLessonOrder`: 0/2 expected RED, `/tmp/beamal-student-order-independent-baseline-red.log`, immutable source copy/manifest retained. Same two assertions now 2/2 GREEN.
2. Native-shaped busy button: first confirm actual opener disabled, then simulate native focus falling to BODY. Pending Escape and current503 both failed to restore exact opener: 0/2 RED, `/tmp/beamal-student-order-independent-busy-focus-red.log`. Current fix passes those unchanged assertions, plus deliberate-other-control, exact disconnected-opener fallback, no-scroll-jump, other-modal/navigation/identity and success-Close no-steal cases.
3. New read404 previously used an inappropriate generic save error: expanded test 6/7 with exactly one RED in `/tmp/beamal-student-order-independent-busy-focus-expanded.log`. Dedicated read-only unavailable/refresh wording now passes; generic save/error handling was not changed for other operations.

Fixture corrections were not product findings: missing synthetic modal-root initialization; a go-to-current-route operation that did not actually navigate; and JSON serialization of undefined. They were corrected before relying on results. Actual tab-click, away/back/history, role and identity assertions remain strict.

## Verified behavior

- Real rendered second card sharing an order with the first resolves exact student/session/order, including same visible names across two distinct children. Forged IDs, ambiguous session/occurrence membership and unready/error source do not trigger another order read.
- Paid fetched order must match exact ID, student, course, and one scheduleId+sequence across the whole order. Wrong child/course, unpaid, absent or duplicate pair and malformed items are rejected before painting private payload.
- Original order snapshot dates may differ from current moved lesson dates. Purchased720minutes is shown from the order pricing snapshot; no derived remaining/validity/components or current-Fee substitution.
- Close/Escape returns to exact newly rendered second-session card, not first matching order, with original page scroll and preventScroll focus.
- Source removal, effective date/time/duration/resource change, unknown/error, role/access/identity and navigation invalidate pending/open state. Remove→restore or503→recover cannot resurrect an old request; unchanged source can complete normally. Later source and order-list updates cannot paint a mismatched card-bound order.
- Older success/401/403 cannot override a newer opening or current identity/focus. Pending Escape and composition protection work; same-card retry remains usable. Current401 clears private identity/cache and navigates to login.
- Existing generic Payment history remains a separate usable path for legitimately unpaid orders. This new paid-card guard does not impose paid-only rules on that existing path.
- Native-shaped Tab includes the order reading scroll body, forward/back/wrap/background containment, and IME Escape. All read/cancel harness mutation spies remained empty.

## Five-axis source review

- **Correctness:** exact stable tuple and current semantic-source key are used, rather than names, first course, original date or orderId alone. Pending owner is consumed on the first invalid state; generation/opening guards protect late replies. Busy-focus recovery is conditional, so it does not steal deliberate new focus or successful dialog focus. No blocker found.
- **Simplicity/readability:** pure helper holds tuple/whitelist/match logic; host has named owner-current/release/restore/invalidate operations. The dense existing src style remains, but this slice avoids adding broad abstractions or new policy. No blocking readability concern.
- **Architecture:** reuses existing authorized student timetable and order endpoint, order renderer and modal/keyboard/navigation lifecycle. Server authorization remains authoritative; client matching is an additional consistency guard. No new persistence, schema or backend ownership introduced.
- **Privacy/security:** authoritative cache membership plus fresh authorized order GET, exact response checks before DOM paint, no metadata/name-based identity inference, whitelist origin/resources and escaped existing renderer. Cross-account late responses are suppressed. Reviewer did not independently re-audit the pre-existing server authorization implementation in this UI task.
- **Performance:** no per-card order prefetch/N+1. One order GET only when selected; current paid-lesson batch is reused. Linear exact-source lookup and small resource-ID sorting are acceptable for the stated demo scale; this is source-level review, not a benchmark.

## Independent screenshot-only review

Viewed with view_image:
- `beamal-student-order-390-zh.png`: actual image390×844. Clear title/Close, readable student/order/payment/amount, compact aligned factual quota rows, three lesson rows and both footer actions. No visible horizontal clipping or control overlap.
- `beamal-student-order-768-en.png`: actual image768×900. Balanced padding, readable long explanatory sentence and label/value alignment, visible footer actions. Body is a scrollable reading area; text cut at the bottom of its current viewport is not evidence of unscrollable content or modal failure.

No blocking visual issue observed in these two images. Pictures do not prove keyboard containment, every scroll position, exact return behavior or a live successful workflow; those claims rely on the separately scoped tests/Parent GUI evidence. Both files currently have `.png` suffixes but JPEG bytes; dimensions were independently checked with `file`. This is a nonblocking evidence-file naming issue reported to Parent, not a layout failure.

## Remaining boundaries / nonblockers

- Full live GUI, actual browser disabling focus behavior and full test/build are Parent responsibilities; this reviewer used native-shaped VM focus/events plus static screenshots, not independent browser control.
- Actual quota deduction, future make-up tuple remapping, remaining balance, validity and package-content persistence remain outside this read-only slice and are not claimed implemented.
- No additional concern justifies extending this slice. Freeze these results at the manifest hashes; if production changes, re-check the affected assertions rather than treating this report as automatic approval.

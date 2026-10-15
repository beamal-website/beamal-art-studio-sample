# Fee details, recorded edits and future-price review — 2026-10-16

## Scope and source

Stage A UI work for Goal v2.5 §5/§8.1 and the Course/Fees/Timetable joint workflow. The new read-only details entry is a deliberate Beamal UX improvement: choosing a name means reading; choosing Edit means changing. It is not claimed as a pixel-for-pixel SchoolTracs screen.

Actual SchoolTracs Course/Fee research is preserved in [the bounded observation](evidence/fee-ui-20261016/schooltracs-observation.md). Its existing Fee name opened Edit; saved pricing was locked and Schedule New Pricing exposed amount/effective date inside that editor. No save was performed. History was not observed in that particular path; this is not proof that SchoolTracs has no history. The reference does not establish when a future price should apply to an order.

## Delivered UI

- Fees, Course detail and Course catalogue now open the exact saved Fee overview. Same-name records are resolved by Fee ID; a shared Fee occurrence also retains its originating Course ID.
- Current pricing shows the three price models, duration/months, Minutes or Visits, booking expiry, linked saved Courses, Fee code and version. Missing facts are unknown, not zero or inferred lessons.
- Admin alone sees actual recorded edits via [the new read-only reader](fee-history-checkpoint-20261016.md). Recorded timestamps/actions/versions and captured prices are not presented as effective-date periods. Empty, unavailable, loading and failed history remain distinct; failed reads offer Retry.
- Admin can explicitly choose the existing current-price Edit, or enter a future-price proposal. The proposal offers amount/date validation, Review, Back to edit, Cancel and Close. Final future Save remains disabled with a local explanation. It does not call the existing current-price save endpoint and does not claim scheduling succeeded.
- A current Fee/version/link change blocks Review while preserving input; deliberate Reload updates only the child source snapshot. An unsaved parent editor, native inputs, operation key and scroll remain untouched. The existing current Fee save behavior is retained separately.
- Owner identity, access revision, route and Course context guard async history/reload. Closing, navigating, logging out or changing access cannot be undone by a late response. Recorded-history failure does not erase an active editor or proposal.
- Scoped scroll bodies, fixed footer, visible keyboard focus, Tab containment and Escape return are implemented. Chinese composing Escape does not discard drafts. The reading body participates in Tab order, allowing both keyboard scrolling and onward movement to footer actions.

## Genuine defects caught

1. Readonly known zero was incorrectly treated as unknown by the proposal amount validator. Known saved/history formatting is now separate.
2. Composition Escape discarded proposal/current editor drafts. An active Fee composition guard fixes both.
3. Course catalogue was initially missed: its Fee names still jumped straight to Edit and Teacher names were disabled. It now shares the same readonly entry as the other two locations.
4. In the actual Chromium Review UI, Close → Tab entered the scroll body; the following Tab was incorrectly recaptured to Close. The body is now included in both traps, explicitly keyboard focusable and visibly outlined. The original actual-browser path and independent inverse-controller RED were retained before the fix.

## Verification

- Formal root regressions include catalogue reader roles, exact entry/history, validation/Review/Back/no-write, parent draft and Course B return, history synchronous-error retry recovery, late owner changes and IME/keyboard-body behavior.
- Independent reviewer: **35 original checks/groups pass**, plus a separately described five-case rerun of the maker's HTTP tests. The final 31 previous groups were rerun unchanged after the four keyboard groups passed. [Report](evidence/fee-ui-20261016/independent-review.md) and [hash manifest](evidence/fee-ui-20261016/independent-manifest.json) distinguish VM/event checks from real GUI.
- Exact-index candidate: **1452/1452**, no failures/skips, 78.028s; Vite build passed in 13.92s. The candidate contained HEAD 9c46fda plus exactly the ten owned source/test files, and reused existing dependencies. Fifteen unrelated untracked Staff Groups tests were intentionally excluded. This is not a fresh npm-install/GitHub-download test. Final candidate source bytes matched the workspace's ten files exactly.
- Existing SQLite experimental and Vite large-chunk warnings remain; these checks are not a whole-system performance certificate. [Machine-readable evidence](evidence/fee-ui-20261016/verification.json).

### Root actual browser acceptance

- Original local Admin service: real Fees → existing shared package → Overview → Edit → unsaved name → future proposal → invalid/valid Review → Back → Escape → original unsaved parent → Cancel → Overview → exact Fee row. Current price and business records did not change.
- Actual Course catalogue and Course B (watercolour) detail: a shared package returns to the correct watercolour occurrence, not the first Course using the same Fee. The isolated existing Nature Sketchbook Workshop shared Fee similarly preserves its second-Course source after Review/Back/Cancel.
- Isolated Teacher signed in through the actual login button: only his two authorized Courses were listed. Two same-name `每堂60分鐘` records resolved correctly; watercolour showed **HK$280 / 60 minutes**, not the creative course's HK$300. Teacher detail contained no edit/future-price/history controls. Closing returned to the exact watercolour Fee row. This is real UI inspection in addition to formal authorization tests.
- Actual CSS widths **390, 768 and 1280** were measured, not inferred from requested viewport size. Chinese and English detail/input/review states, long Workshop names, local scroll bodies and reachable footer were inspected. Browser origin zoom required calibration on localhost; exact 768 was subsequently verified on the isolated origin at normal zoom. A full Cartesian matrix of every width × language × price model was not repeated.
- Real Review Close → Tab → reading body → Back now works; reverse/wrap and background recapture also have independent event coverage. PageDown/End reaches proposal values and notes while the footer remains visible. Invalid input focuses `fee-pricing-error`. Real physical IME composition was not simulated; the explicit composing-event regression is recorded separately.
- Mouse/input and screenshot tooling had transient failures. Each was checked against the resulting DOM before continuing. Cropped/offset/unfinished-paint captures were rejected; only inspected complete evidence is included. No browser security restriction was bypassed.
- Current source renders HK$1,100.50/2026-11-01 in the phone proposal and HK$390.75/2026-11-01 in the Workshop proposal; both retain saved current prices and disabled final Save.
- Original service restarted on the same 5180 port/database; real Admin history loads. All **42 original database tables remain identical** to the pre-slice snapshot. The isolated DB changed only `sessions` due explicit Teacher logout/login and restoring Admin; its business tables are unchanged. No future/current price, Course, payment or enrollment was written in this slice.

Screenshots: [390 details](evidence/fee-ui-20261016/overview-390-zh.png), [390 Review](evidence/fee-ui-20261016/review-390-zh.png), [768 details](evidence/fee-ui-20261016/overview-768-zh.png), [768 Review Chinese](evidence/fee-ui-20261016/review-768-zh.png), [768 Review English](evidence/fee-ui-20261016/review-768-en.png), [768 invalid input](evidence/fee-ui-20261016/invalid-768-en.png), [1280 Review](evidence/fee-ui-20261016/review-1280-en.png).

## Still required

Future-price persistence/application boundaries, effective periods, conflicts and scheduled-price cancellation remain Stage B/policy work; recorded edits do not complete those requirements. Current-price save remains the earlier separate behavior and is not claimed as newly re-accepted here. Whole Course/Timetable, all UI and the Goal remain incomplete.

Next priority: PDF-GAP-05/PDF-GAP-11 and W-02/C-07/S-02 — package component/segment contents and consistent Minutes/Visits reading in Course, order, roster and Student. There is presently no component model; order snapshots contain purchased units but not authoritative remaining balance. Do not guess deductions, divide minutes into lessons, or copy another student's package. A-03 deduction and segment scheduling policies remain undecided; their UI/read work can proceed without deciding them.

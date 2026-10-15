# Fee overview / future proposal / recorded edits — final independent review

Date: 2026-10-16 (Asia/Hong_Kong)
Reviewer: `/root/staff_leave_host_map`
HEAD: `9c46fdab62afd6643e0eea97077c88d2ac570017` plus the working source hashes in the manifest.

**PASS within this documented UI/host/read-source scope. No unresolved blocker in the exercised matrix.** This is not a claim of live-browser acceptance, future-price persistence, policy approval or completion of the whole Goal.

## Final results and provenance

| Evidence | Actual result | Scope |
| --- | --- | --- |
| Preserved original baseline host assertions | 0/4, four genuine RED | Fee-name edit bypass, disabled Teacher reading, no reachable proposal Review, unproven order-start-date text. |
| Same original behavioral assertions on fixed source | 4/4 PASS | Original entry / readonly / Review / text behavior. |
| Original independent pure UI checks | 7/7 PASS | Price/date/raw draft limits, roles, escaping, proper units/history snapshots, known zero versus unknown. |
| Original native-shaped event groups | 7/7 PASS after genuine 5/7 IME RED | Review/Back/Cancel, parent draft, source-change/reload, late history, identity/navigation, composition Escape. |
| New independent extended host groups, final exact source | **13/13 PASS**, 523.99 ms | Same-name Fee IDs, all three real name-entry surfaces, nested Course B/global return, malformed/late/failing history and revocation. |
| New native-shaped keyboard-body groups | **4/4 PASS**, 722.07 ms | Review/Edit and Admin/Teacher Overview native body paths, reverse paths, wrap and background recapture. |
| All prior original checks/groups rerun on keyboard-final source | **31/31 PASS**, 566.05 ms | No changed green assertions; scoped regression only. |
| Maker history HTTP file independently rerun | 5/5 PASS | Separate formal-test rerun in isolated temporary DBs, not new reviewer-authored tests. |

There are now **35 reviewer-authored checks/groups** (the prior 31 plus four keyboard groups), with loops covering additional permutations. All prior 31 were rerun unchanged after the last controller/markup change and passed. The separate five maker HTTP tests remain unchanged and were not repeated. This is a targeted `/tmp` regression run, not the project full suite.

## Newly completed host matrix (13 groups)

1. Real global Fees second same-name Fee opens its own exact ID, version 7, saved price HK$654.32 and 720-minute package; history requests and Edit form use that exact ID, not the first same-name Fee.
2. Real Course catalogue FeeName uses Overview instead of directly entering current-price Edit.
3. Authorized Teacher can read the exact catalogue FeeName, while Admin history requests and edit/proposal controls stay unavailable.
4. Global Fees and Course B each exercise Overview → Edit → proposal → Review → Back → Cancel, plus direct Overview → proposal → Cancel. Same unsaved parent values and operation key survive. Overview body scroll and exact fresh outer opener survive; same-name/different-ID or wrong Course occurrence is not substituted. Source route, Course month, fee query/filter, groups, captured scroll and page position are retained.
5. Wrong Fee envelope, non-array records, duplicate audit IDs, invalid version and missing pricing fail closed as errors without rendering private payload; actual Retry replaces them with an exact valid record.
6. Async 503 is an error, never fake empty history. Repeated refresh during the pending read remains single-flight; Retry recovers the real record and does not expose transport details.
7. An older success, 401 or 403 cannot change a newer Fee owner, route or loading state, and cannot trigger session refresh for the new owner.
8. Closing and reopening the same Fee ID creates a new owner; a reply for the older opening does not fill it.
9. Current history 401 clears session, Fee/read/proposal state and private caches, and navigates to login even while a current-price editor is open.
10. Current 403 actively rechecks the account; a changed Teacher/Student role or same Admin with changed access revision clears child, parent, history and private Fee cache. The pending typed proposal cannot revive.
11. Explicit identity, role, access revision, `go` and real popstate navigation dismiss the old owner before a delayed success/401 resolves; late reply does not steal focus or revive modal/private history.
12. Late history success or 503 while Edit alone is active does not remount its native-shaped parent form or alter unsaved fields/version/operation key/body position. Cancel shows the updated real history/error state; Retry remains usable and outer Course B opener is restored.
13. Forged inaccessible Fee ID, Student and anonymous overview/edit/proposal/history commands do not open the source or perform writes.

All exercised proposal and Cancel paths assert zero current-price, Course or metadata writes. Proposal final Save remains disabled; the earlier native groups also forge the final submit and verify it does not call `saveFee`.

## Genuine issues found and fixed

- **Recorded price zero mislabelled unknown:** readonly formatting reused future proposal validation. The maker separated known readonly amounts from the future `.01..1,000,000` rule. Original independent check now passes; null remains unknown and future zero remains invalid.
- **Composition Escape discarded Fee drafts:** actual keydown-shaped events with `isComposing:true` / `keyCode:229` closed the child and Overview→Edit. Root added an active-Fee composition guard. Both unchanged original failing checks now pass.
- **Course catalogue entry omitted:** the real `portalCourses()` FeeName still used `fee-edit`, and Teacher's authorized name was disabled although global Fees and Course detail used Overview. Two genuine reviewer REDs were preserved before Root changed the exact catalogue action/reader-enable expressions and added a formal regression. Both original reviewer assertions pass in the final 13.

### Harness corrections, not product findings

- Earlier FormData fixture needed a setter because the shared harness assigns values; validator errors bind to actual input field names. Validity/raw-value assertions were retained.
- The initial extended global return competitor had an impossible extra Course dataset on a global-only Fee button. The corrected competitor is an actual same-name/different-Fee-ID global row; Course B still competes against the wrong Course occurrence. Exact ID/source/focus assertions remain intact. This intermediate failure was not reported as a product defect.
- Month return checks compare the actual captured local date key, avoiding a UTC serialization assumption.

## Final keyboard-body follow-up

Root discovered the real browser problem: Review Close → Tab reached Chromium's focusable scroll body, but the old modal trap treated that body as outside and returned to Close, preventing keyboard access to Back. Root owns the live GUI evidence; this reviewer did not operate a browser.

The independent four-group model parses the actual active modal's document order, excludes its inert parent and disabled/hidden controls from native Tab order, calls the real keydown handler, and simulates native movement only when the handler permits default. Each group covers forward and reverse body movement, first/last wrapping, and recapture when focus starts on a background element:

- Review: Close → body → Back and reverse; disabled final Save never enters the native path.
- Edit: body → amount/date/footer and reverse; raw draft remains unchanged.
- Admin Overview with actual history error: Close → body → Retry and footer; no trap at the body.
- Teacher Overview: Close → body → footer Close; no hidden Admin controls or history request.

**4/4 PASS.** The same checks against a reconstructed exact pre-fix controller (`922f479e…`, current focusable-body renderer) are **0/4 RED** at body → next movement, isolating the actual selector/trap failure. This is a controlled former-controller regression, not a claim to have rerun a historical browser build. One intermediate fixture accidentally parsed the inert parent controls; it was corrected to parse the active modal only, retaining every body/navigation/wrap assertion.

Final source-delta proof: reversing only the two body-selector additions, two `tabindex="0"` attributes and two body `:focus-visible` selectors recovers exactly the three pre-keyboard file hashes. The CSS outline rule is scoped to the Fee dialogs; actual visual outline placement remains Root's GUI responsibility. No new logic or source/privacy issue was found.

## Five-axis review

- **Correctness:** canonical Fee ID and saved pricing units are separate from draft inputs. Readonly recorded edits are not mislabelled scheduled/effective pricing. The expanded matrix covers same-name, Course B/global origin, malformed source, parent draft and current/obsolete authentication errors. Root's final catalogue action closes the evidenced inconsistent entry path.
- **Simplicity:** reuse of existing current-price save and isolated readonly history avoids creating a second price-writing path. Inert parent DOM preserves unsaved native values instead of reconstructing them from saved data.
- **Architecture:** owner object identity plus account/location checks guard asynchronous history; child snapshot changes require explicit rebase. Navigation/identity disposal prevents stale replies reopening state. The promise boundary around `feeHistory` makes synchronous throws retryable. No broad architecture refactor is required for this slice.
- **Privacy:** HTTP history requires session/Admin before decoding/existence; exact parameterized Fee ID and whitelisted DTO keep unrelated data out. Teacher source and host render only authorized current Fee facts, never request Admin history. Unsafe text is escaped; malformed snapshots remain unknown rather than borrowing current/private facts. Host tests independently verify revoked and superseded owners fail closed.
- **Performance:** one on-demand, matching-owner single-flight history read; no per-row history fetch. Late history avoids remounting an active editor/proposal. This is a code/behavior observation, not a benchmark or scale claim.

## Limits

- No independent browser, GUI screenshots, physical/native IME session, mobile sizing, accessibility tree, actual browser focus/scroll physics or keyboard acceptance by this reviewer. Root exclusively owns live IAB acceptance. DOM/event cases use a native-shaped VM harness.
- No source edits, Git mutation, live/user DB operations, full suite or build by this reviewer. Maker HTTP test rerun used only isolated temporary fixture databases.
- Future scheduling persistence and backdating authority remain pending business/functionality work. The UI intentionally does not save or claim a future price was scheduled.
- All requested extended host gaps are now exercised, but this is still bounded acceptance of this Fee UI slice rather than whole-system or whole-Goal completion.

## Evidence

- Contract: `/tmp/beamal-fee-overview-independent-contract.md`
- Preserved initial interrupted report/manifest: `/tmp/beamal-fee-overview-independent-review-initial-frozen.md`, `/tmp/beamal-fee-overview-independent-manifest-initial-frozen.json`
- Baseline RED: `/tmp/beamal-fee-overview-baseline-independent-red.log`
- Original host: `/tmp/beamal-fee-overview-independent-initial-4.log`
- Pure: `/tmp/beamal-fee-overview-pure-independent-final.log`
- Native genuine RED and unchanged GREEN: `/tmp/beamal-fee-pricing-native-independent-current-7.log`, `/tmp/beamal-fee-pricing-native-independent-final-7.log`
- Catalogue genuine two-case RED: `/tmp/beamal-fee-overview-course-catalogue-independent-red.log`
- Expanded original script/helper: `/tmp/beamal-fee-overview-extended-independent.mjs`, `/tmp/beamal-fee-overview-extended-helper.mjs`
- Final expanded 13: `/tmp/beamal-fee-overview-extended-independent-final-13.log`
- Separate maker HTTP rerun: `/tmp/beamal-fee-history-reviewer-targeted.log`
- Keyboard-body script: `/tmp/beamal-fee-keyboard-body-independent.mjs`
- Former-controller RED / final GREEN: `/tmp/beamal-fee-keyboard-body-independent-red.log`, `/tmp/beamal-fee-keyboard-body-independent-green.log`
- Final unchanged 31 regression: `/tmp/beamal-fee-overview-regression-final-31.log`
- Pre-keyboard frozen report/manifest: `/tmp/beamal-fee-overview-independent-review-pre-keyboard.md`, `/tmp/beamal-fee-overview-independent-manifest-pre-keyboard.json`
- Final hashes/source-delta proof: `/tmp/beamal-fee-overview-independent-manifest.json`

Final source SHA256: `e7bc5d74d198e9570de3106736c8a08714ca38726abba32970d9bd8d73cd8949`.
Final flows SHA256: `56882f15ed283dcaa530687becbe5bedbdaebcdfd3a4bff8265fd40608caf162`.

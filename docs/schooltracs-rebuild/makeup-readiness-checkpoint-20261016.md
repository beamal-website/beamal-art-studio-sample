# Make Up This Class — honest slot states and small-class verification

2026-10-16, branch `test`, following `03d58fd`. Scope remains Timetable/Courses and their direct dependencies. **Neither Make Up This Class nor the narrowed Timetable/Courses goal is complete.** No Goal definition, other module, user database or pending business policy was changed.

## User effect

Replacement slots now distinguish loading, read failure, unknown availability, policy-not-open and verified empty results. A malformed collection or duplicate slot ID rejects the entire collection; it cannot silently become “no slots” or offer a usable subset. Unknown capacity is not zero. Errors do not echo private upstream diagnostics.

Review separates the original lesson from the selected replacement. Stale arrangements freeze date/selection changes while keeping Back/Close usable. Find/Retry appears only when the host explicitly provides a real loading capability; the current live host has no such capability, so no dead query buttons appear. The final target Confirm remains disabled/inert. Existing real Pending and attendance operations are preserved.

Actual ordinary-Teacher inspection found a reopened saved Pending with an empty draft still offered Review, then asked the user to choose the already-disabled Pending action. Added a failing regression, then disabled duplicate review until a valid different target is selected. This changes no saved arrangement or entitlement. Selected targets can still be reviewed in controlled fixtures; final confirmation stays disabled.

## Sources and unresolved policy

Fresh original PDF page 2 plus the saved Notion source support exact-student arrangements, same-topic eligibility and both-end updates. They do not settle how original/target seats, credit, topic/date windows and ordinary-Teacher final authority work. See `evidence/makeup-readiness-20261016/source-contract.md` and `placement-implementation-map.md`.

Three human questions remain pending: move versus additional supplementary lesson; teacher-assigned topic/date window versus a specified fixed cycle; and supported target types/capacity/Teacher authority. No recommendation was treated as approval. The real resolver still returns unknown candidates; no eligibility API, final booking endpoint, target placement, seat transfer, credit deduction or completed-Pending task is claimed. Existing Absent correction/reopening and public Trial form-policy questions also remain unresolved.

## Verification

- Final full `npm test --prefix sample`: **1895/1895**, no failure/cancel/skip, 53.79 seconds. Includes the 15 pre-existing untracked staff-roster tests, which are not part of this change.
- Final `npm run build --prefix sample`: passed, 7.43 seconds. Existing large-bundle warning remains; it was not hidden by raising its threshold.
- Pure workflow: 51/51 final. Seven initial state cases gave six genuine failures; the added reopened-Pending GUI regression gave 50 pass / 1 failure before its fix, then 51 pass.
- Independent renderer/reducer: 9 semantic groups passed before the final one-line duplicate-review correction; the subsequent independent review records that correction separately. See evidence reports, not a claim of final-target HTTP integration.
- 300-student small-class scale validation is documented separately in `enrollment-small-class-checkpoint-20261016.md`; it validates existing paid enrolment and whole-occurrence movement, not individual Make Up.

## Actual browser versus controlled fixtures

The real isolated service `127.0.0.1:64048` and actual authorized Teacher login were used. Teacher worklist → Chloe's exact Creative Drawing lesson, 2026-10-16 13:00, reopened its persisted Pending. Unknown candidates render truthfully, no Find/Retry is shown, and already-saved Pending/duplicate Review are disabled after the fix. Escape returns to the same worklist item and restores focus. At 390×844, document width equals viewport; controls and content are readable and reachable. Captured console warnings/errors: none. This inspection performed no business write or rescheduling.

The other three screenshots are explicitly **isolated renderer fixtures**, using the actual pure component with controlled source states: 390×844 English target review, 768×900 Chinese read failure, and 1280×900 English unknown availability. They verify typography, spacing, source/target separation and reachable footer. The supplied target and three places are fictional presentation inputs, not real eligible availability, bookings or user-database records. Gallery pages have no business service. Existing Beamal images were not changed.

No database reset/reseed, external send, push, main operation or unrelated module work occurred. Teacher sign-in changed only isolated authentication state. Original user tab was preserved. The remaining complete target-selection/confirmation, Absent lifecycle, unresolved policies and final joint acceptance remain core work, not minor deferrals.

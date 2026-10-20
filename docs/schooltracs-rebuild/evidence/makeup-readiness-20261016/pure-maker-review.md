# Make Up This Class policy-neutral pure UI maker review — 2026-10-16

## Scope/evidence

Owned only sample/client/shared-lesson-workflow-ui.js, .css and sample/tests/shared-lesson-workflow-ui.test.mjs. Root owns controller/src/canonical context and future slot API; business questions are still pending.

Before changes:43/43 PASS, /tmp/beamal-makeup-pure-baseline.log. Added7 tests: six genuine RED and one already-correct Pending independence case, giving44PASS/6FAIL, /tmp/beamal-makeup-pure-contract-red.log. Final50/50 PASS, no skips, /tmp/beamal-makeup-pure-green.log. JS/test syntax, trailing whitespace and95 scoped CSS rules pass. No full-suite/build/browser/DB/service/Git by this maker.

## Frozen state/actions

Existing availability flags retained: {ready,loading,error,slots}; one optional policyUnconfirmed===true flag. No future endpoint, identity DTO, quota/deduction policy, final-save capability or ACK schema invented.

Loading is explicit, errors have natural generic copy with no raw token/diagnostic exposure, unknown is not known empty, policy-unconfirmed is an optional not-open-yet state. Current source defaults remain unavailable, with no fixture slots.

Only ready===true plus a valid full array is authoritative. Every row must have nonempty string ID, real ISO date/time/positive within-day duration, literal boolean eligible, and available either unknown null/undefined or a nonnegative safe integer. IDs must be unique across the full array. Any malformed/duplicate row fails the entire source closed; it never becomes an empty list or a usable valid subset. Well-formed eligible=false rows are known negatives, and true[] is known empty. Unknown/full places remain disabled.

Verified target selection/review is still read-only. Review now labels the existing single source context Original lesson and the target card Selected replacement. It does not duplicate the original facts, choose a course, infer qualification or alter session attendance/capacity.

Read actions appear only if capabilities.loadArrangementSlots===true, which Root may set only when a real loading hook exists. Commands query-slots/reload-slots use existing ui-shared-lesson controls; buttons typebutton. Native date input remains name=date/data-ui-command=filter-date. Query validates raw date and respects busy/uncertain/stale/loading; error uses Retry. Network commands are inert in the pure reducer, so only the host can actually read data. Current live capability is absent/false, so no dead buttons are added.

Read status marker #slw-slots-status has status/alert and tabindex=-1 for future host focus. Existing #slw-body, form/actions/source-return contracts remain. Stale arrangement now keeps draft/date immutable in the pure reducer and disables its date input, while Back and Close remain usable. Attendance stale annotation draft semantics are unchanged.

Pending Confirmation's actual save capability, uncertain same-key behavior and host ACK remain unchanged. Pending can still save independently when replacement slots are loading/error/unknown-policy. Student readonly and Attendance cases remain covered.

Final selected target confirmation remains permanently disabled even with forged save/saveArrangement/confirmArrangement flags. All final reducer commands stay inert. No selected-target saved/confirmed claim or new receipt format exists in this slice.

## Existing test changes

One prior error-state test now accepts the explicit Could not load copy while retaining every no-zero/no-private-data assertion. One prior mixed malformed source fixture was split into a valid array test and stricter whole-source rejection tests, as explicitly approved by Root. Full/unknown-capacity/false-eligibility/duplicate/unknown-ID selection checks are preserved or strengthened; disabled final expectations are unchanged.

## Five-axis review

Correctness: distinct source states, whole-source rejection, known negative/empty, hook gating, original-vs-new review, stale immutability and no forged final completion have targeted coverage. No blocker found in owned pure scope.

Readability/simplicity: one private replacement-status resolver, reuse of current flags/draft/slots and a small optional source heading; no parallel controller or new source model.

Architecture: qualification and write authorization stay with the future backend/host. The pure reducer cannot read, write, create a slot or fabricate a booking. Pending remains separate from selecting a target.

Security/privacy: no private dataset, inferred teacher/student eligibility or identity matching from labels. Labels and source errors are escaped; unknown capacities do not become zero. Root must bind future service data to the exact student/session/query and ignore late/revoked replies.

Performance: full-array validation/unique-ID check is linear and local; existing slot sorting/accordions retained. No requests, polling, database writes or dependency additions.

## Explicit limitations

This is actual UI correctness work while human rules are pending; it is not completion of Make Up This Class. No actual eligible-slot backend/read hookup, final target save, booking ACK, capacity transfer, quota deduction, expiry policy, cross-teacher sync or notices are claimed. Root/independent QA must validate actual controller behavior, keyboard/IME/scroll and390/768/1280 rendering.

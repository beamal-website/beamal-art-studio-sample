# Pending Confirmation pure UI maker review — 2026-10-16

Scope: sample/client/shared-lesson-workflow-ui.js and sample/tests/shared-lesson-workflow-ui.test.mjs only. No CSS change. Root owns authorization, exact source/session ownership, persistence, retry keys and ACKs.

## Evidence

- Initial two new cases: existing 35 pass, new 2 fail; /tmp/beamal-pending-confirmation-pure-initial-red.log.
- Full new contract before production: existing 35 pass, new 7 fail; /tmp/beamal-pending-confirmation-pure-contract-red.log.
- Additional strict missing-readiness case failed before the sourceStatus fix: /tmp/beamal-pending-confirmation-readiness-red.log.
- Final single-file run 43/43 pass, zero skipped: /tmp/beamal-pending-confirmation-pure-green.log. Both JS/test syntax checks passed.
- No full-suite/build/browser/database/service/Git operations by this maker in this slice. This is code and pure-markup/reducer evidence, not independent live GUI or end-to-end persistence proof.

## Host contract

- Top-level state.arrangement is canonical {status:null|pending,version:0|positive,...}; a positive pending version prevents duplicate Pending save but still permits viewing replacement slots.
- Host ACK only: state.pendingConfirmation {studentId,sessionId,status:pending,version:positive integer} must match the exact current student/session. Only this plus step=saved renders #slw-pending-saved (role=status, tabindex=-1). Pure reducer never creates an ACK or saved state.
- Save command save-pending, type=button; review form #shared-lesson-workflow-form data-ui-command=save-pending. It requires view=arrange, draft.arrangement=pending, capabilities.savePending===true, explicit ready source, nonbusy/nonstale/not already pending. Known uncertain/unconfirmed + source error permits the host's original-key replay; no new body is fabricated here.
- Busy disables buttons/date filtering and leaves the draft immutable. uncertain/unconfirmed disables Back, selection, filtering, Pending and Review while keeping Close usable. Explicit stale always blocks Save and tells the user to close/reopen.
- continue-arrange is purely local: matching saved ACK -> edit, keeps source and ACK, resets selection to pending/no target. Actual slot Review still uses final-confirm and always disables it.
- #slw-save-error stays focusable role=alert/tabindex=-1, escaped and prewarmed; #slw-body stays tabindex=0 for the host focus trap/scrolling.
- Legacy no-capability states, Attendance and Student flows retain prior behavior. No attendance/capacity/payment values are changed.

## Five-axis review

Correctness: exact ACK matching and explicit capability/readiness; unknown no longer inherits legacy ready in the new capable arrangement flow. All final reducer commands remain inert. Known saved canonical Pending avoids repeat saving, including after continue-arrange. Stale overrides uncertain retry. PASS in this pure scope.

Simplicity: three small private predicates reuse existing state/markup and styles. No new renderer module, lifecycle, network code or business policy.

Architecture: host exclusively supplies canonical facts and save ACK; reducer owns local draft/review/navigation only. No source mutation or fetch/storage dependency.

Privacy/security: exact student/session ACK check, escaped user/error text, no new contact, billing, teacher, capacity or private fields. Host must still reauthorize actual saves and ignore late identity/source replies.

Performance: constant-time pending predicates; no new polls, requests, writes, caches or per-student queries. Existing slot filtering/rendering unchanged apart from control disabled states.

## Limitations / pending integration

No blockers found in the owned pure scope. Actual persistence, same-key replay, version drift, teacher grants, Todo deduplication, polling, IME/focus restoration and mobile layout require Root's controller/backend/runtime acceptance. Target replacement confirmation, release/deduction/eligibility policies remain disabled and are not claimed completed.

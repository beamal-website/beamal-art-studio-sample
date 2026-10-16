# Attendance Save pure UI maker review

Scope: two owned renderer/reducer and unit test files only. This is maker verification, not independent review or live GUI evidence.

- Correctness: explicit attendance save capability + explicit ready source + valid draft + no stale/busy required. Arrangements remain disabled. Busy reducer does not change drafts; Back/Close remain available when stale and not busy. Annotation-only changes preserve known unmarked attendance and never select Present.
- Simplicity: existing local validation, button and source helpers retained; no new package/dependency.
- Architecture: Save command is presentation only; reducer remains inert. Host owns API, authorization, current-source verification and successful acknowledgement.
- Privacy/security: canonical student/session preserved; raw user-facing saveError and remarks escaped. No network, storage or database code added.
- Performance: bounded existing draft checks; no new requests or source polling in pure module.

Formal evidence: initial 26/31 RED then 31/31 GREEN; annotation extension 32/34 RED then 34/34 GREEN. Final command node --test sample/tests/shared-lesson-workflow-ui.test.mjs. Syntax and scoped git diff --check passed. Full suite/build/real GUI reserved to Root.

Markers: #slw-save-error always prewarmed, role=alert tabindex=-1 outside reading body; #slw-body tabindex=0. Form data-ui-command review in edit, save in attendance Review with explicit capability; no form data-action, novalidate for controlled conditional attendance validation. Save button type=button command save.

No commit/push, database or browser actions. Root approved accessibility correction: canonical unmarked radios do not claim required; other canonical states keep required. Formal assertion first RED 33/34 then final GREEN 34/34; logs /tmp/beamal-attendance-unmarked-required-{red,green}.log. Validator still rejects unchanged/no-op unmarked forms. Final two files frozen.

Recovery follow-up: verified stale attendance Review with lost save capability shows only the unsaved notice plus changed-source alert, never the legacy saving-unavailable explanation; Back/Close remain enabled and final Save disabled. Non-stale legacy Attendance and Arrange notices unchanged. New regression first 34/35 RED then 35/35 GREEN: /tmp/beamal-attendance-stale-capability-pure-{red,green}.log. Final syntax/scoped diff checks passed.

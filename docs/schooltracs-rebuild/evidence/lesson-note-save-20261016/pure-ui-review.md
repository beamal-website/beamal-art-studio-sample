# Lesson note persistence pure UI maker verification

Final frozen scope: sample/client/timetable-notes-ui.js and sample/tests/timetable-notes-ui.test.mjs only. This is author verification, not independent QA, backend acceptance or live GUI evidence. Root owns controller/API/CSS/integration; no repository files outside these two were modified. No browser, DB, service, Git, full suite or build actions were used.

## Behavior and stable contract

- Explicit lesson persistence mode requires a sourceStatus property. Missing property retains the legacy edit/review presentation with final Save disabled. Date remains legacy even with forged note/capability fields.
- Persisted note facts bind exact scheduleId, sequence, courseId, effective date/time and sourceVersion to model fields. Version is a safe integer >=0; sourceVersion >=1; canWrite is boolean; text is a string <=2,000 chars; version0 updatedAt=null, otherwise a nonblank parseable date string. Unknown or mismatched sources do not render another lesson's saved text or enable Save.
- Only authoritative canWrite=false makes the note read-only. Save capability false alone keeps the raw editable draft visible; loading temporarily disables its textarea and Review, preserving input state. A failed read with a previously validated writable note keeps the textarea enabled for local draft continuation but Review/Save disabled.
- Valid ready writable Review plus explicit capabilities.save=true enables tt-note-save. Busy/stale/invalid/nonready never enable it. Review Save is type=button; edit Review remains native type=submit without data-action, with id tt-note-review. Form #tt-note-form still uses existing data-ui-command values.
- New blank notes are rejected. A validated existing note (version>0) permits an empty raw string and explains that Saving will clear it. No text trim or persistence is performed by the renderer.
- Busy locks Close/Back/Review/Save/textarea and sets form aria-busy=true. Stale keeps the raw draft and Back/Close while describing changed information; no false saved success.
- #tt-note-body tabindex=0. Persistent mode prewarms #tt-note-source-state (status/alert tabindex=-1), #tt-note-retry (button/data-action tt-note-retry), and #tt-note-save-error (alert tabindex=-1), outside the bounded body after the header. Read-only/initial loading/error content uses .tt-note-content, no editable form. Root has been asked to include this container in flex rules and body in Tab/focus styling.

## Verification

Original10 cases retained. Initial8 new cases: 11/18 PASS +7 genuine RED before implementation, then 18/18 GREEN. Root confirmed transient-capability correction: two additional tests yielded 18/20 RED, then final20/20 GREEN.

Logs:
- /tmp/beamal-lesson-note-persistence-pure-red.log
- /tmp/beamal-lesson-note-persistence-pure-green.log
- /tmp/beamal-lesson-note-transient-capability-pure-red.log
- /tmp/beamal-lesson-note-transient-capability-pure-green.log

node --check passed. Scoped file whitespace/newline validation passed without Git operations. Full tests/build and real GUI remain Root's work.

## Five-axis maker review

Correctness: exact source identity, capability/readiness, unknown-vs-known-empty, raw clearing, busy/stale and error paths tested. Simplicity: existing model/exports/form selectors reused; one private DTO validator; no dependency added. Architecture: pure render/validation only, no authorization inference from role names, no API/storage calls. Privacy/security: canWrite=false only shows canonical text; mismatched DTO/private diagnostics never rendered; text/saveError escaped. Performance: constant bounded checks on one note, no requests/polling/re-render side effects introduced.

Remaining integration boundary: Root must dispatch native submit by authoritative stage and serialize writes/idempotency, handle source versions/role/navigation invalidation and actual ACK, preserve existing exact parent return/caret/scroll, and perform independent review/live GUI. No whole-system completion is claimed.

Final observed-recovery follow-up (Root actual VM finding): sourceStatus=error with a known authoritative writable note now keeps the textarea enabled for local draft editing/caret restoration. Review/Save remain disabled; unknown initial source renders no form; busy disables and canWrite=false is read-only. Error text distinguishes failed update from failed initial load. Original earlier requirement to disable known error fields was superseded by Root after actual native focus constraints. New21st test genuine20/21 RED -> final21/21 GREEN, /tmp/beamal-lesson-note-offline-draft-pure-{red,green}.log; syntax and scoped whitespace/newline passed. No host/DB/GUI/full/build changes or claims.

# Student records — 19 October 2026

Reference inspection was read-only in the user's signed-in SchoolTracs session. Student list, student Info/Journal/Assessments/Orders/Payments/Reschedule History/Logs tabs, Journals Create, assessment Templates Create, Cases Leave/Enrollment, and Notices Create were inspected. Blank reference dialogs were cancelled; no reference records were created or changed.

## Implemented locally

- Five Students navigation entries; a large student profile with Info, Orders, Payments, Journal, Assessments, Reschedule history, Cases, Notices and Logs.
- Existing formal people fields and contact editing remain the source of profile information. Missing student numbers are shown as missing, never fabricated. Existing order and rescheduling records are read from their actual stores.
- Administrators can create/edit journal entries, assessment templates and assessments, follow-up cases and notices. Records persist in the shared database; versions prevent silently overwriting another editor. Idempotency keys prevent duplicate submissions on retry.
- Journal visibility defaults to internal. Student login access is determined by existing explicit student-account links; only shared journals and completed shared assessments are returned to that account.
- Assessments keep the template version and rubric used at creation. Later template edits do not rewrite historical assessments.
- Notices target selected students, have draft/published states and optional signing deadlines. Families sign an exact notice version. Updating a notice does not carry a previous signature forward to the new version.
- Cases are follow-up records for leave/enrollment. Saving one does not approve leave, enroll a student, move a seat, or change attendance/payment. Those operations retain their existing workflows.
- Record changes and previous notice signatures are retained for history. No archive/delete UI was added.
- Desktop/mobile layouts, bilingual labels, separate profile scrolling and modal keyboard navigation are supported.

## Boundaries

This is not complete SchoolTracs parity. Student-record attachment upload, import/export, assessment template spreadsheet-style editing, student avatar upload, and new account-access controls are not implemented here. Existing reference-only helper dialogs are not evidence of completed delivery. The new records management area currently requires an administrator; no teacher access has been silently widened.

Validation uses temporary databases and controlled test fixtures. Browser inspection opens/cancels forms on the existing local database without inserting business records. Local verification does not establish deployment or a GitHub push.

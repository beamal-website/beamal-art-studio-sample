# Course major-gap source observation — SchoolTracs
Date: 2026-10-16 (Hong Kong)
Method: existing authorised Chrome user tab; one bounded Course detail → existing Fee → pricing form / Course basic edit / Materials flow. This is a live reference observation, not a claim that Beamal has equivalent functionality.

## Scope / safety
- Original user page was Sales → Courses. Login remained active.
- No new tabs, no field input, no checkbox/switch changes, no Save/Create/Delete, no pricing/configuration changes.
- Only existing Course and Fee were opened; forms were closed without input.
- No repo, database, Git, Goal or source-document edits.
- Original Sales Courses page was restored and verified loaded at the end; empty Order Panel and no open dialog. Other tabs were untouched.

## Observed: Course detail and fee entry
1. Courses list existing Course “Beamal QA 20261014” opened its detail at /v4/web/courses/2.
2. General tab showed:
   - Schedule table, month selector and Add;
   - Fees table: Name / Fee / Applied to / Display in Online Store;
   - two existing fees (Per Lesson and Fixed Month);
   - Settings: Display in Online Store / Add video conferencing link setup.
3. Clicking the Fee name “Beamal QA Per Lesson” in the Course Fees table opened a modal titled “Edit Beamal QA Per Lesson” directly. A separate read-only Fee detail page was not traversed.
4. The form contained Fee name (display on receipt), optional Category, Pricing model, Booking expiry and linked Courses.
5. Existing pricing was visibly locked:
   - checked monthly-per-lesson radio disabled;
   - Price for one lesson 300 disabled;
   - Duration of a lesson 60 disabled;
   - No. of months 1 month disabled.
6. There was a specific “Schedule new pricing” button.
7. The Course Fees row end icon was an X-in-circle (visible screenshot), not a three-dot/history menu. It was not clicked, as it could remove a relationship.
8. Online Store switches were not changed.

## Observed: Schedule new pricing
1. Activating “Schedule new pricing” expanded fields in the same Edit Fee modal; it did not open a separate dialog.
2. New fields:
   - New price (currency $ visible);
   - Effective date with an explicit required asterisk;
   - Choose date button;
   - an unlabeled icon button beside that block (purpose not established; not clicked).
3. The old pricing fields remained disabled.
4. Footer remained Save; heading retained Close.
5. No values were entered and Save was never invoked.
6. Close successfully dismissed the modal and returned to the same Course detail. The existing Fee displayed $300 / hr (1 mo) afterward.
7. No explicit “Price history” / “Pricing history” entry was visible in this existing Fee edit or its expanded pricing block. This is “not observed in this path,” not evidence that SchoolTracs has no price history anywhere.

## Observed: Course suitability / content
1. Top-level Course Edit opened “Edit course” with exactly the following visible business fields in this existing record:
   - Course name;
   - Category (optional);
   - Level (optional).
   Footer: Delete / Save; heading: Close.
2. No visible minimum/maximum age, age suitability, course description, introduction or learning-content field appeared in that basic Edit course form.
3. Form was closed without input; same Course detail remained.
4. Materials tab showed an Add button and a table:
   Name / Description / Owner / Uploaded on.
   Its visible empty state was “No material yet.”
5. Therefore Materials in this viewed record is a material/file list; its Description column must not be misrepresented as a confirmed general Course description field.
6. Online Store “Set up” was not opened: it is a separate configuration flow beyond this bounded Course/Fee inspection.

## Unknown / policy boundaries
- Successful new-pricing validation, effective-date boundary semantics, retroactive pricing, existing-order treatment, conflict handling, scheduled-price cancellation and save return path were not tested.
- Whether a different record with multiple pricing versions exposes a history list is unknown. This record only established the current-price display and future-pricing form.
- Category / Level selection options and whether they encode age were not opened; do not equate Level with an age range.
- Age / description could exist elsewhere (for example store configuration); the current basic Course form did not show them. No broader absence claim is supported.
- No source rule for fee history retention, automatic repricing, age eligibility or booking eligibility was inferred.
- No mobile, nonzero-scroll, saving or data-synchronisation claim is made.

## Bounded Beamal design implications (inference only)
- A Fee view can show canonical current pricing and have a separate, explicit effective-dated pricing flow; a simple editable amount should not silently imply retroactive replacement.
- Course suitability / public introduction fields, if required by Beamal's own source, must remain explicit Beamal requirements instead of being claimed as confirmed SchoolTracs basic fields.
- Existing fee identity / parent Course context should stay visible when opening price work. Close/Cancel should return to the same Course and fee context.
- Price history needs an authoritative version source and an honest empty/unavailable distinction; no invented timeline is justified by this observation.

## Tool limitation
Two click/keypress calls reported input-dispatch deadlines, but the immediately refreshed DOM showed the intended modal had opened. Observations above are taken from the resulting visible DOM/screenshot, not merely from a successful command return. No repeated bypass or alternative browser control was used.

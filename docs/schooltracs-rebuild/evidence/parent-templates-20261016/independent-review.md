# Personal parent-message templates — independent review, 2026-10-16

## Current disposition

**FINAL PASS for this bounded personal-template slice: 23 independent semantic cases pass; no unresolved blocking finding.** Root confirmed final production freeze matches the verified source hashes; final screenshot-only review is complete. This is not a claim that all Settings or Messages is complete. I changed no repository/Git/live database/existing service/browser; only `/tmp` tests/reports. HTTP uses fresh disposable `/tmp` databases and ephemeral loopback services, cleaned up by fixture teardown. No credential/hash output.

## Adopted source/implementation boundary

Source research: `/tmp/beamal-parent-template-source-contract-20261016.md`. PDF p3 confirms the individual student/lesson parent-message entry; Notion local snapshot6.4 line121/register P-02 confirms teacher-side Settings → Preset Message to Parents, reuse/fill/edit/preview. Personal-only scope, literal content, archive/restore/versioning were **Root's explicit bounded implementation choices**, not claimed as visible PDF fields.

Adopted: Admin and Teacher each manage/use **own** templates; Admin cannot cross-owner. Teacher receives only limited personal-template Settings entry, not schoolwide settings authority. Plain title/body, no interpolation/translation/channel auto-switch. A chooser exact GET followed by explicit body review copies that reviewed literal snapshot on Apply; it does not re-read or live-bind later template updates/archive. The existing exact recipient/source-revision/send boundary remains unchanged.

## Independent executed results

- **7 actual HTTP/server cases**, `/tmp/beamal-parent-template-independent-http-20261016.mjs`, final `/tmp/beamal-parent-template-independent-http-20261016-final.log`, 7/7, 3.81s. Teacher with no course grants owns a library; two Admins/Teacher share a title but exact IDs and separate private bodies. Cross-owner list/get/edit/archive/restore cannot leak; Student/anonymous denied. Raw body with spaces/newlines/Chinese/HTML/token-looking text is literal. Full-field updates, version conflict, immutable-key retry, archive/restore with version increments, no hard delete, role revocation during paused body and private receipt replay denial, concurrent deduplication, restart, audit-failure transaction rollback, public DTO exclusion and unchanged old business rows verified.
- **9 actual controller + actual default pure renderer cases**, `/tmp/beamal-parent-template-independent-controller-20261016.mjs`, latest `/tmp/beamal-parent-template-independent-controller-20261016-page-red.log` (despite historical filename, **9 PASS / 0 FAIL**, no product RED occurred). Separate Review/Save and actual ACK gate, exact same-name second template, 409 reload preserves human body but adopts current version, malformed201/lost ACK retry same payload/key, busy duplicate/close guard, explicit archive/restore review, chooser Apply vs Cancel, late identity/parent guard rejection, wrong-ID response cannot Apply, source error does not leak raw upstream error, actual markup native title focus, and a shrunk last page recovers to a valid source page. Root had already fixed title selector/page recovery before these cases ran; I do not claim those as my findings.
- **7 actual complete-src VM integration cases**, `/tmp/beamal-parent-template-independent-fullsrc-20261016.mjs`, final `/tmp/beamal-parent-template-independent-fullsrc-20261016-final7.log`, 7/7, 0.25s. Helper `/tmp/beamal-parent-template-fullsrc-harness-20261016.mjs` disables test registration only and executes current full src, actual constructors/resolver/renderer. No stubbed opaque ticket or forced successful return.
  1. Exact second same-name student composer → child chooser → review/Cancel; global render retains raw WhatsApp channel/body and the original session ticket; Close restores original lesson/menu/scroll/focus.
  2. Explicit Apply copies reviewed literal snapshot even if the reusable template later changes/archive (Root's stated policy), preserving App channel/recipient; no send until original actual Preview + Send.
  3. Native template fields → Review → Back across app render → Save: only final Save invokes one template API; saving templates sends zero parent messages.
  4. Ordinary Teacher gets personal Settings entry with no general school tools; Student cannot open manager or see entry.
  5. Account change/navigation invalidates both private levels and parent lesson ticket; late Apply cannot resurrect content.
  6. Native title/body click and IME do not cause accidental parent action/save.
  7. Actual recipient revision changes during child template view: applying literal body does not bypass stale-source warning/review; zero Send call until exact source is revalidated.

## Source review

- `server/parent-message-templates.mjs`: actor lookup uses actual current DB role; `owner_id=actor.id` on every list/get/write; only safe DTO fields; raw title/body preserved with trim used solely to validate nonempty; CAS and template/audit transaction.
- `server/app.mjs`: reads mutation body then reauthorizes role/owner before idempotent receipt lookup. No permanent authorization from an earlier GET. GET/list parameter allowlist and own-only reader preserved.
- `client/api-client.js`: six explicit methods; known title/body/version and filter fields only, encoded exact ID and existing same-origin/session-epoch/idempotency machinery. No owner supplied by browser.
- `client/parent-message-template-controller.js`: exact list/detail IDs, immutable operation and ACK validation, owner/location/parent guard, back/reload draft preservation.
- `client/lesson-parent-message-controller.js` and `src.js`: real composer child picker, parent draft suspended rather than recaptured from child form, original exact student/lesson resolver ticket, two-level identity invalidation. Literal copied text remains editable and the original current-recipient revision is still required to send.
- Pure renderer safely escapes title/body, does not evaluate tokens, and distinguishes loading/error/empty and actual saved receipt. No fake global Settings/Email-template storage substitute.

## Transparent test corrections (not product findings)

- Initial HTTP1 failed because my operation key contained URL slash characters and was correctly rejected400 before the intended cross-owner404 check. I replaced it with a valid key, preserved safety assertions, and reran7/7. Also fixed malformed-shape case keys so they test payload validation rather than invalid key validation. Initial log retained.
- Initial controller7 incorrectly asserted that a legitimate first record's already-authorized list excerpt must disappear after rejecting a wrong detail response. Correct invariant is no Apply/selection from wrong ID plus a visible local error; exact-ID assertions retained, now passes. This was not a product data leak.
- No genuine independent product RED was found in this slice so far. Do not report the misleading `*-focus-red.log`/`*-page-red.log` names as RED evidence: they contain passing results against Root's already corrected candidate.

## Evidence limits / remaining steps

- HTTP proves isolated actual persistence/authorization, not the user's live data. Full-src DOM is a controlled event/focus/scroll model, not actual browser rendering.
- No fresh Chrome/SchoolTracs observation this slice; known tooling failure was not retried. Sources are the original PDF image and local Notion/Goal snapshots.
- No external WhatsApp link/send, push/email delivery or family reply claim. Applying/saving a template is not sending a message or completing Absent/Pending.
- Full suite/build and actual 390/768/1280 GUI are Root's responsibility. I have not rerun full tests/build. Final screenshot-only review is recorded below.

## Final screenshot-only review and reported verification

I used `view_image` to inspect these four actual images supplied by Root; I did not operate a browser or claim browser interaction from the VM model:

- `/tmp/beamal-template-apply-mobile-20261016.png` — 390 English. Template body and original message are separately visible, replacement warning is explicit, Back/Replace footer and X remain readable and unobstructed. Long heading/button labels wrap naturally; no horizontal cropping or overlap observed.
- `/tmp/beamal-template-editor-mobile-20261016.png` — 390 Traditional Chinese. Real editable title has visible focus, message and 2,000-character note readable, consistent inner spacing, Back/Review visible; no cut-off text or covered primary action.
- `/tmp/beamal-template-settings-768-20261016.png` — 768. Private ownership notice, saved acknowledgement, active/archive buttons, search/new and first complete template card align with usable margins. Lower card continues below the bounded body; footer remains visible. Source CSS uses a separately scrollable body; this image alone does not prove scroll interaction.
- `/tmp/beamal-template-settings-desktop-20261016.png` — 1280×900. Modal is centred with readable line lengths, background ordinary Teacher Settings entry visible, correct private-library notice, fixed footer and no overlapping content.

**No visual blocker in the reviewed images.** These four images substantiate layout/editor/explicit replacement UI, not a claim that the recipient actually received a message. Root separately reports real IAB Teacher create2/archive+restore/restart persistence; Cancel retained exact raw WhatsApp draft, Apply→edit→explicit App-send succeeded, template later edited without changing sent snapshot. Root's Student inbox verification was still the next GUI step when this update was requested. My isolated HTTP and full-src tests independently cover persistence and exact App send boundary but do not substitute for Root's live UI evidence.

Root reports final required full tests **1882/1882**, 44.07 seconds, and build green in 1.86 seconds with the existing chunk warning. I did not run or re-count that full suite/build. No repeat of unchanged independent tests was needed after Root confirmed the same source fingerprints.

### Final source fingerprints (current files read only)
- `sample/src.js`: `317c4db52e969635cd2f5e1a8890befcc6d2773699c1f99fdc04cefd6c5e16ab`
- `sample/client/parent-message-template-controller.js`: `e0564fdea7323244c8abe5c1fc7aeac9dc6bd2ec749f08e3293e04d4b120a675`
- `sample/client/parent-message-template-ui.js`: `bcb5047def1a92d5950d801379f833d81a7324e239328aba473cb435f9d62839`
- `sample/client/lesson-parent-message-controller.js`: `fdba2373918744544df3c18b285cde0d193bc2301168c99cfe6c0888b7dc97dc`
- `sample/server/parent-message-templates.mjs`: `f8a90b240fa03970f1da547f31e264c52230de8270c123a3eeedd81ac1ab03f5`
- `sample/server/app.mjs`: `b3372905ae3fa67817432d6fb774cc1ab7341f3f98ee5bf7da0199180362d75b`
- `sample/client/api-client.js`: `16deb887300cebc904e6a469c01703e53910fa13bb4beea413000946d3cd6e8b`

### Last static Admin Settings grouping correction

Root moved the Admin personal-template entry into a separate plain tools div before the Scheduling section. I read the final `portalSettingsTools` and updated only the source fingerprint above: `src317c4db5…`. The limited Teacher entry, constructors/controllers, API and data are unchanged. This removes the misleading semantic grouping under Scheduling; no new authority or behavior is introduced. My full-src tests assert entry availability/limited Teacher authority and real template/composer behavior, not that old Admin wrapper, so this static change does not affect their assertions and I did not rerun unchanged cases. Four reviewed Teacher screenshots remain applicable. Root reports actual Admin UI personal library empty while Teacher owns two, additional live confirmation of isolation.

The earlier1882/full-build figures above preceded this final static markup adjustment; Root is rebuilding/rechecking the final static source, and this report does not falsely count those pending checks as completed. Independent disposition remains PASS with no blocker.

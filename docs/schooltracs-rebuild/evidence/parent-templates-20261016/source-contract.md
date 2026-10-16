# Preset Message to Parents — source contract (research only)

2026-10-16. Scope: reusable templates inside the already implemented **exact student + lesson Send Message to Parent composer**. No repository/Git/database/service/browser changes; only this `/tmp` report. Parent contact was committed by Root as `9898959` on `test`, not pushed (Root report, not independently checked here). This report does not implement or certify templates.

## 1. What the sources actually confirm

- **Original client PDF p3** `/Users/yausiuhei/Downloads/Beamal web & app rough brainstorm remark (eileen.pdf`: I re-opened the previously rendered complete p3 image `/tmp/beamal-absent-source-page3.png` in this turn. The handwritten student-row ⋮ actions are **Make Up This Class / Postpone / Send Message to Parent**. It locates the workflow at an individual student in a particular lesson. **The original p3 does not visibly define a template manager, template fields, CRUD permissions, channels, variable syntax or personal/shared template scope.** Those details must not be cited as directly visible in the PDF.
- Local Notion snapshot `docs/schooltracs-rebuild/notion-requirements-source.md:119–124` confirms two channels (WhatsApp / App Notification), **Settings → Preset Message to Parents**, maintenance of reusable message templates, select template → fill editor → modify text → Preview → explicit send. WhatsApp must be honest hand-off, not pretend automatic external delivery; App messages identify the real sender. Notification categories remain separate.
- Register `docs/schooltracs-rebuild/notion-requirements-register-source.json:408–421`: **P-01 Send Message to Parent** says presets fill the editor before preview; **P-02 Preset Message to Parents** explicitly says **teacher-side Settings manages templates; text is editable before sending**, and labels this detail **conversation supplement**. This is confirmed extension to the original, consistent with the user's accepted PDF-first + Notion-extension priority.
- Current Goal `docs/schooltracs-rebuild/ULTIMATE-GOAL-PROMPT.md:274–275` requires correct recipient, templates, fill, edit, preview, named/System separation and local App/Email test channels. It does not decide ownership/sharing, translation requirements or placeholders.
- Existing comparison `docs/schooltracs-rebuild/pdf-notion-comparison-20261015.md:64–72,132–135` explicitly warns that channel/template/unique-task details were not all written on PDF p3. Keep original functional direction and detailed confirmation provenance separate.
- Notion `:306–307` describes **Preset Email Templates with Subject + Body and a PDF attachment**. This is a different receipt-email requirement, not proof that WhatsApp/App parent presets need email Subject, attachment, amount, invoice or bilingual variants.

These are **local snapshots**, not a fresh read of live Notion or a fresh SchoolTracs template screen. The known Chrome/CDP timeout was not retried; Root expressly stopped further reference browser work this turn. No new SchoolTracs observation is claimed.

## 2. Minimal complete confirmed product path

1. An authorized staff user can open **Settings → Preset Message to Parents**, maintain more than one reusable plain-text message, save it durably, leave/reopen and see the actual saved version.
2. From the exact authorized student/lesson composer, choose a saved eligible template, fill the **message body**, edit it freely, then preview the actual current child/lesson/sender/recipient and final text.
3. Selecting/applying/saving a template **does not send** and does not change student/lesson/recipient/channel, attendance, Pending, capacity, payment, account links or Absent completion.
4. Explicit App send keeps the existing real local App-test path and exact current context revision/idempotency protection. WhatsApp remains explicit copy/link hand-off, never automatic external send.
5. Back/Cancel/X/Escape returns to the original composer and exact lesson with raw message/channel/focus/scroll preserved. A quick “Manage templates” link from the composer is a useful **design proposal**, not an extra source-confirmed entry; if added, its parent return must be exact.

“Maintain reusable templates” strongly implies a real create/edit/save workflow and stable selection. **Permanent delete vs archive/deactivate, undo, ordering, sharing and conflict rules are implementation/policy choices, not explicitly enumerated by the source.** Do not claim these exact semantics were specified in the PDF. A delete/archive decision must preserve already-sent message snapshots and an already-edited composer body.

## 3. Permissions and scope — do not silently invent

**Confirmed:** template management is on the teacher side of Settings, so an Admin-only manager that ordinary teachers cannot use would not fulfil the stated teacher workflow. Student/anonymous must not manage templates. Existing exact parent contact remains limited to Admin/current responsible teacher; read-only lesson grants do not become send authority merely because a template exists.

**Not confirmed:** personal templates vs all-school library; who may edit/delete another teacher's template; whether Admin sees/edits private teacher templates; staff sharing/copying; ownership transfer when someone leaves; visibility after role revocation.

**Least-privilege bounded proposal for Root to explicitly adopt:** Admin and Teacher each manage/use **their own** templates, with owner taken from authenticated identity, never a form `ownerId`. No cross-owner read/write/delete, even for an Admin, unless a separate shared-library rule is approved. This can deliver reusable teacher templates without granting global settings authority. It is an engineering scope choice, not a fact quoted from Notion. If Root instead wants a shared studio library, define who can publish/edit it before enabling shared destructive writes.

**Numbering caution:** parent-message register **P-02 Preset Message to Parents** is not the same namespace as the Notion pending-discussion **P-02 attendance deduction** at source line197. Do not confuse that old numbering collision with template requirements being unconfirmed.

## 4. Body, language and placeholders

- Minimal proposed record: stable opaque `id`, authenticated owner, one human-readable `name`, plain-text `body`, version/update metadata. A title/name is for selecting the preset, not an outgoing email Subject. Proposed length limits are technical (e.g. body remains within current 2,000-character composer limit), not business policy.
- Sources do not require every preset to contain both Chinese and English or mandate translation/fallback. UI remains bilingual; a teacher may write body/name in either language. Do not force both bodies or silently translate/change the outgoing text.
- Two supported contact channels are confirmed; **separate per-channel template bodies or channel restrictions are not**. Safest minimal proposal: the same plain-text body is reusable in either available channel; applying it does not auto-select a channel or recipient.
- “Fill the editor from the selected template” is confirmed. **Dynamic placeholder syntax and automatic personalized fields are not explicitly defined.** A literal plain-text template copied into the editor already fulfils that minimum. Do not borrow the unrelated receipt email's `{{amount}}`/`{{invoice_number}}`/`{{attachment_name}}` variables.
- If Root elects bounded dynamic fill, treat it as a declared implementation extension: allow only values already verified in the current exact parent-message context, such as `student_name`, `course_name`, `date`, `time`, `sender_name`. Define one syntax, perform a single safe substitution, do not evaluate code or recursively expand substituted text. Unknown token/value should stay visible/unresolved or give a local validation message; never silently fill an invented name/date/zero or another child's values.
- `parent_name` is especially ambiguous: WhatsApp primary recorded parent name and App linked-account display name are different facts; the latter may be the student's account name (as in the current demo). Do not invent a guardian identity. Avoid this placeholder unless channel-specific meaning is explicitly defined.
- Never automatically include private attendance remarks/stickers, address/contact2/email, sibling data, prices/balances or internal notes in outgoing text. They are not in the existing narrow contact context.

## 5. Current actual code and reusable boundaries

- `sample/client/lesson-parent-message-controller.js:47–85`: real exact-context composer opens with `draft:{channel:'app',message:''}`, captures raw body/radio, provides edit→preview→back, immutable-send retry and exact ACK gating. **No template source/list/apply command is present.** The current stable context-revision recipient and sender checks should remain the send boundary.
- `sample/client/lesson-parent-message-ui.js`: actual edit controls contain contact channels and message text, followed by Preview; no saved-template selection or manager yet. Add to this real path, not the old preview-only lesson flow.
- `sample/src.js:184–189,1284–1322`: real roster ⋮ → canonical resolver/opaque return ticket, and exact menu/focus/scroll restoration. Reuse for composer→template manager→composer; do not replace with loose student names or caller-provided parent facts.
- `sample/client/operations-ui.js:251–254`: current Settings tabs include invoice **Templates** and **Email templates**; neither is **Preset Message to Parents**. The former is document layout, not parent-message content.
- `operations-ui.js:529,536`: existing email-template editor and reducer work against preview data; “updated preview/no message sent” is not durable parent preset storage. Do not reuse its fallback-to-first-template behavior or label the existing preview save as a real preset save.
- `sample/client/lesson-workflow-ui.js:79–82`: legacy preview-only message view has fixed `absence` / `arrangement` choices, a generic prefilled message and a potentially unsafe recipient fallback to student name. This is not evidence of a saved parent-template library and must not become the new canonical route.
- `sample/server/app.mjs`, `store.mjs` and `sample/client/api-client.js`: current parent-contact/send/inbox API exists, but this read found **no parent-preset persistence/CRUD endpoint**. Future template APIs must be additive, not silently reinterpret Email templates or private schoolwide Settings.
- `docs/schooltracs-rebuild/v2-ui-inventory.md:96–106` is useful historical inventory but out of date: it predates the real parent-contact/inbox slice. Actual code is the current integration source.

## 6. Independent acceptance contract for continuation (not yet executed)

1. Real create/save/reopen/restart of at least two differently named presets; exact IDs, including same-name presets, cannot fall back to the first record. Saving a preset does not send any message.
2. Admin/Teacher/Student/anonymous and cross-owner cases reflect the **chosen** policy; owner/role fields in body cannot grant scope. Revocation after body await and cached replay must reauthorize. No public/student DTO exposes templates.
3. Apply template A to **second same-name child, second occurrence**: exact literal body or only declared safe context substitutions, correct channel/recipient untouched. Unknown/missing token facts do not borrow child one or fake a value.
4. Manually edited composer text stays raw (spaces/newlines/Unicode included). Opening/closing Settings, background refresh, saved template modification/deletion or language toggle cannot silently replace it. Explicit Apply is the only overwrite action; proposed select + “Use template” makes that intent clear.
5. Edit/save conflicts keep the user's draft; network failure/lost ACK retries same payload/key, double click writes once, bad ACK never shows success, navigation/identity change suppress late private replies.
6. Cancellation from editor/manager restores the correct parent composer, same selected channel/message, exact lesson ticket, focus/caret/scroll. Native select/radio/textarea and IME retain normal behavior; no closest-action capture causes accidental preview/save.
7. After final Preview, existing actual App-test success/retry/inbox still work. No App link is still not sendable; stale recipient requires reload/review, no template can bypass it. WhatsApp remains an explicit external hand-off only.
8. Editing/deleting a reusable template never changes already sent body/sender/recipient/history. No attendance/order/people/link/slot/hold/balance/Paid change. Existing business tables compared row for row in isolated fixtures.
9. Bilingual UI at 390/768/1280 with long names/body, unknown source/error/empty distinguished. Settings location and composer selection are both reachable; no obsolete preview-only success is presented as real saved state.

## 7. Decisions needed before enabling broader policies

- Personal-only vs shared studio templates, and cross-owner Admin/Teacher edit/delete rights.
- Literal fill only vs bounded dynamic tokens; exact token syntax and unknown-field behavior if dynamic fill is chosen.
- Hard delete vs archive/deactivate; no need to invent either from PDF evidence.
- Per-channel body variants, multiple language bodies, read receipts/replies/external delivery are **not required to complete the confirmed minimum** and must not be silently assumed.

Research complete. Wait for Root's chosen contract and production freeze before independently testing implementation. No fresh browser claim, no template implementation or completion claim this turn.

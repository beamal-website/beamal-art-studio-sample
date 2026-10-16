# Exact lesson parent contact — independent review, 2026-10-16

## Disposition

**PASS for this bounded local App-test/contact slice; no unresolved blocking finding in the verified scope.** This does not certify all Messages, templates, external delivery, parent replies, Absent completion policy or the whole system. I changed no repository file, Git state, original database, existing service or browser. HTTP evidence uses only newly created `/tmp` databases and ephemeral loopback services; they are cleaned up by the tests. No credentials or credential hashes were recorded.

## Independent results (18 semantic cases, all pass, zero skip)

1. **6 real HTTP / actual server cases** — `/tmp/beamal-parent-contact-independent-http-20261016.mjs`; final log `/tmp/beamal-parent-contact-independent-http-20261016.log`, 6/6, 3.63 seconds. These are my own cases, not a rerun/count of the maker's tests. Setup creates three same-name students with shared-looking primary telephone numbers but distinct explicit child/account links, and buys/accepts/confirms the exact second occurrence using the real enrollment store flow.
   - Exact second child + occurrence projection, narrow primary recorded parent, no child email/contact2/private profile fallback.
   - Raw text, actual sender, correct recipient inbox and persistence after service restart. Existing commercial tables compared row for row (only sessions and idempotency receipts exempt).
   - Child reassigns A→B while A retains a sibling: A loses this child's history; B does not inherit A's old message; new B message only B; unlink removes B's view. Same phone/name never grants access.
   - Missing WhatsApp or account link remains unknown; no link means no successful send.
   - Contact version change rejects stale send/replay. Teacher loses responsibility, receives explicit course read grant, still reads roster but cannot read/send parent contact; Admin projection names the actual Admin. Student/anonymous cannot read contact.
   - Concurrent same-key replay gives one durable message/audit; changed payload conflicts. Forced audit SQL failure returns error, leaves no half message, same-key retry after removing the test trigger succeeds. Public DTOs contain no sentinel message/contact.
2. **5 actual controller + actual pure renderer / SDK cases** — `/tmp/beamal-parent-contact-independent-controller-20261016.mjs`; final `/tmp/beamal-parent-contact-independent-controller-20261016-final5.log`, 5/5. Real default renderer, not a success stub.
   - Only exact ACK tuple (session/child/recipient/sender/body) permits `#lpm-saved`; wrong ACKs and missing link never show success.
   - Lost/malformed successful ACK + previously started failed background read can really retry immutable payload with the same operation key.
   - Hidden initial inbox response is dropped; reentry starts a new read immediately.
   - Real API client malformed 201 JSON drives actual controller's unconfirmed UI, then retry succeeds with byte-identical raw JSON/key and same-origin credentials.
   - Actual SDK invalidation rejects late private contact and inbox responses as `AUTH_SUPERSEDED`.
3. **7 actual full-src VM integration cases** — `/tmp/beamal-parent-contact-independent-fullsrc-20261016.mjs`; final `/tmp/beamal-parent-contact-independent-fullsrc-20261016-final7.log`, 7/7. Helper `/tmp/beamal-parent-contact-fullsrc-harness-20261016.mjs` derives generic fixtures from current flows tests, disables test registration only, and executes the current complete `src.js` with the real contact controller, resolver and renderer. It does not stub resolver success/return tickets.
   - Actual roster action → exact second same-name student's opaque ticket → native input/FormData Preview → Back → global render retains raw draft → Cancel restores same course/lesson tab, original scroll, opens original ⋮ menu and focuses exact opener.
   - No App link cannot Preview/send/succeed; valid exact ACK alone reaches actual saved markup.
   - Recipient revision drift stops old review; explicit Reload retains text and requires review of newly verified recipient.
   - Navigation/account replacement suppress late send ACK, clears private ticket and cannot resurrect success.
   - Global native radio/textarea click remains native (no preventDefault); no accidental send.
   - Student hidden read/reentry, error clears stale records, retry restores source; logout/account replacement cannot adopt prior private inbox response.

VM DOM is a controlled event/focus/scroll model, not a real browser. It proves actual host call paths and data ownership, not visual painting or OS/browser event fidelity.

## Two genuine findings, now fixed and independently rerun

Original fixed tests: `/tmp/beamal-parent-contact-independent-controller-20261016-initial.log` = 1 pass / 2 fail. Assertions were preserved when rerun against fixes.

1. **Enabled retry did nothing after lost ACK + background read failure.** The pure renderer enabled retry while controller send required ready source. Root now invalidates a pre-send read and permits only an existing immutable uncertain operation to retry. The originally failing case now passes, including same payload/key and actual saved gate. Current controller `send`, around lines 61–76.
2. **Inbox reentry remained in loading until ordinary poll.** A hidden first response was discarded but left loading status; `ensureInbox` only fetched idle. Root clears hidden/obsolete job/cache to idle; original case and full-src reentry now pass. Current `readInbox` / `ensureInbox`, around lines 95–107.

Root's separately found native controls, radio focus-by-value and closed ⋮ return were also independently covered in the full-src path. I did not count Root's own formal test total as independent evidence.

## Source/authority review

- `sample/server/enrollment-orders.mjs:214` resolves the authorized exact paid student session using current occurrence/teacher source. Contact DTO is primary recorded parentName/WhatsApp plus explicit linked account, not whole people/profile or emergency contact.
- `sample/server/lesson-parent-messages.mjs:34–54` reauthorizes current source/revision before send, inserts message+audit transactionally, and inbox uses original recipient **and** current same-child account link intersection.
- `sample/server/app.mjs:232–247` authenticates/CSRF-checks, reads body then authorizes again before durable replay, so a prior private receipt is not sufficient after revocation/source reassignment.
- `sample/client/api-client.js:161–163` uses exact encoded session path, strict revision/message body, existing operation key, same-origin/session epoch mechanism; inbox only serializes permitted pagination fields.
- `sample/src.js:184–189` integrates the actual controller and canonical roster authority; contact write authority is separate from the existing read-only arrangement entry. `:1284–1322` restores exact lesson/menu/focus/scroll; `render` around `:2679` harvests private raw form before remount and restores position.
- Source contract: `/tmp/beamal-parent-contact-source-contract-20261016.md`, original PDF p3 / local Notion lines119–124 / Goal274–275. These are local source snapshots, not a fresh live Notion/SchoolTracs claim.

No destructive message fallback, no automatic parent inference, no automatic Paid/Convert/attendance/capacity/balance/Pending/Absent change, no external WhatsApp launch during Preview. Templates remain future work.

## Screenshot-only visual review

I inspected the following actual screenshots supplied by Root using `view_image`; I did **not** operate the GUI myself:

- `/tmp/beamal-parent-preview-mobile-20261016.png` — 390×844. Contact header, exact child/course/time/sender and full message are readable. Body has sufficient horizontal padding, header/close/footer visible, Back/Send fit with natural label wrapping, no cut-off or covered primary action. Blank space before footer is harmless stable modal layout.
- `/tmp/beamal-parent-inbox-mobile-final-20261016.png` — 390×844. Sidebar collapsed, System vs named Teacher messages clearly separated, card text and long message wrap correctly, logo/menu and headings aligned with consistent margins.
- `/tmp/beamal-parent-inbox-768-20261016.png` — 768×900. Traditional Chinese labels readable; sender/time and message fit, no horizontal clipping.
- `/tmp/beamal-parent-inbox-desktop-20261016.png` — 1280×900. Left navigation and right page aligned, readable card width, message/sender/exact lesson details unobscured.

**No visual blocker in these four images.** Preview's recipient displays the actual linked account display name (Chloe Ho in this demo), distinct from the separate recorded WhatsApp primary-parent name; this is an explicit account link, not proof of a real-world guardian identity. The screenshots do not alone prove delivery/persistence/keyboard behavior; independent HTTP/full-src evidence above and Root's reported real GUI/restart are separate.

## Limits and remaining work

- Confirmed success means a real record saved in this local App-test store and visible to its authorized inbox. It is not external push/email/WhatsApp delivery or read receipt.
- WhatsApp external link was not clicked; templates CRUD, reply, preference/consent policy and Absent lifecycle are not certified complete.
- Root reports actual GUI three-role/restart evidence and final full 1847/1847 tests in 46.98 seconds and build in 6.66 seconds (existing chunk warning); I did not run full tests/build or independently manipulate the browser. The four images are screenshot-only review.
- Existing original DB was never opened by my tests. Root separately reports original50 tables unchanged and new message tables empty; I did not reproduce that live-data comparison.
- Initial full-src nonpasses were fixture-binding mistakes, not product defects: expecting WhatsApp's name while App selected, reading a stale mocked `#modal-root` after full `#app` render, and feeding an old family's stub response to a second *new* identity request. They were corrected to the real channels/DOM target/request ownership while preserving safety assertions; logs retained for transparency.

## Verified source fingerprints

- `sample/src.js`: `0fa08646b00576d2c27919d008b2363c0342d0dce1e466ab6d5b4ffcb544ea2c`
- `sample/client/lesson-parent-message-controller.js`: `4a934a9884b93924c64c43d97af112f317f5c79bdbc33e57eda2799d863204a1`
- `sample/client/lesson-parent-message-ui.js`: `2a6cc8591ede4fa9285dc881e67808ced47c37f03ccc35a50e659dc1b351cfc0`
- `sample/server/lesson-parent-messages.mjs`: `35fa14ef86766a71d11c483cd2f29ceab098679f2c64a47102dad3f06350310b`
- `sample/server/enrollment-orders.mjs`: `39ffd03a5f8a32f997ad36da198cf531be0e943eb945d98b710ab57c95edaea9`
- `sample/server/app.mjs`: `bb2e23969deddc2d988d16edf030f1d68370d8a4d2b92e3b08b9959d7f9b1deb`
- `sample/client/api-client.js`: `7d61081d607dfb2843a96f7ce419f64c38d0e039f4ca9226bb4d9d93ebd2f642`

## Final refreshed screenshots / final verification update

Root supplied two newly captured final-state images, re-inspected using `view_image` only:

- `/tmp/beamal-parent-inbox-mobile-final-20261016.png` (390×844): English System section now says “System notifications are not available yet.” This accurately distinguishes unavailable source from verified empty records. Teacher message remains readable with proper side margins, line wrapping and separate sender/lesson/message. No clipping, overlap or obstructed controls observed.
- `/tmp/beamal-parent-inbox-desktop-20261016.png` (1280×900): Chinese System section now says「系統通知暫未提供。」; Teacher content and navigation remain aligned and unobscured. No new visual blocker.

**Final disposition remains PASS for the bounded slice.** This addition is screenshot-only; I did not operate the browser, DB or service, rerun the independent suite, full suite or build. Root reports final full 1847/1847 green, 46.98 seconds, and build green in 6.66 seconds with the existing chunk warning. Root confirmed frozen source fingerprints unchanged from the prior report; the screenshot wording now matches the final unavailable-source boundary. The earlier 768 image belongs to the prior wording state, so only these refreshed mobile/desktop images substantiate the final wording.

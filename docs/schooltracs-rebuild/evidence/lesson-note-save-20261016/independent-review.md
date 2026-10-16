# Independent current-source review: persisted single-occurrence notes

2026-10-16. Read-only repo/source; only `/tmp` tests/report written. No browser, live service, database, full suite, build, Git, or Goal changes.

Evidence: `/tmp/beamal-lesson-note-independent-20261016.mjs`; `/tmp/beamal-lesson-note-independent-expanded.log` (12 cases, 11 pass and one concrete UI recovery failure). This evaluates current complete `src.js` in the existing flow fixture VM, with actual production note renderer/validator and SDK, plus small native-form/textarea/body nodes parsed from its real HTML. Formal flow tests are suppressed in the adapter. It is controlled in-memory transport, not a real GUI/HTTP/SQLite claim.

## One observed issue, accepted by Root for repair

When a known writable saved note is being edited, a background read failure (503) repaints through `readTimetableNote` → `drawTimetableNote('close')`. Text stays preserved in state and visible in the current renderer, but focus is moved from the still-authorized textarea to header Close; caret/selection direction and input/body scroll reset. Reproduction sets typed multiline text, selection 4–9 backward, input scroll37/body193, then runs actual background read. Fixed independent case 9 asserts focused new textarea and those exact positions. It fails at focus; not a made-up screenshot result.

Relevant current paths: `src.js` `readTimetableNote` error/redraw branches and `drawTimetableNote` restore only for focus='text'. Root also notes actual browser cannot focus a disabled error textarea; known writer can keep local editing while Review/Save remains blocked. The actual input-harvest guard must permit that known-writer error draft too, rather than only enabling the DOM control.

## Eleven passing outcome cases

1. Read/save exact second occurrence, original versions/raw text/stable key, return same Course/month/lesson roster; no order/schedule/local business state mutation.
2. Canonical canWrite=false read grant displays saved note and rejects native or forged mutation.
3. Initial network read error cannot masquerade as a known empty editable note; retry reads the same tuple and only then enables input.
4. Lost successful malformed-200 ACK followed by poll of committed note can retry original exact body/version/key, accept once and toast once.
5. Navigation or identity switch during pending write clears the actual state; late ACK neither toasts nor puts private content in current rendered app. The old fake modal node object is not used as evidence after full app rerender.
6. Source version drift and wrong-occurrence ACKs retain draft with no success or target fallback.
7. Unchanged poll does not remount textarea; focus, caret, direction and both scrolls remain intact.
8. Background read error keeps visible typed text and hides raw transport diagnostic; does not substitute the old saved value.
10. Native Review/Back restores raw text/caret/direction/scroll; Cancel returns exact parent without write, reopening reads saved source rather than cancelled input.
11. Actual SDK preserves exact encoded schedule+sequence, GET no body, raw PATCH versions/text, CSRF, same-origin credentials and stable retry key.
12. Actual SDK read and write responses reject with AUTH_SUPERSEDED after invalidation, rather than returning old private text.

Initial harness-only issues are retained transparently in early logs: fixture FormData.values getter needed a setter because the existing flow harness assigns it; after full app navigation the old fake modal object can remain detached, so current rendered `#app` and actual state are checked. These were test harness corrections, not product findings; privacy/result assertions were retained.

## App/SDK/backend source review (not independent runtime DB proof)

`app.mjs` note route decodes exact tuple, validates positive integer sequence and rejects query fields; GET requires session, PATCH mutation/CSRF. After asynchronous body read, `authorizeWrite` runs before `mutateOnce`, including cache replay. Canonical actor+route+key+payload hash identify replay; known-route fallthrough includes lessonNoteMatch for 405. `lesson-notes.mjs` reloads actual DB role, checks current canonical occurrence/course/read scope and explicit own teacher links for write, uses independent version/sourceVersion CAS and private audit. It does not borrow paid-session authority, schedule remark, student remark, or public slot notes. No new privacy/target blocker found in this source pass.

Backend maker's own persistence/HTTP cases, restart, visual/mobile rendering, real multi-client synchronisation, marker visibility and total Goal completion remain separate evidence. No pass above implies changes to attendance, seat occupancy, Full, leave, deduction, or pending makeup policy.

## Final independent retest after accepted focus/error-edit repairs

Root fixed read-status repaint to restore the still-authorized focused textarea, while first loading/read-only/revoked states do not gain write controls. Pure owner changed known-writer error textarea to remain locally editable; Review/Save are blocked while source is not ready. The independent node harness now also implements actual disabled-control behaviour (`disabled.focus()` does nothing, reads disabled from the real textarea markup), so passing cannot rely on focusing a browser-disabled field.

Original twelve outcome assertions were retained, with case 13 added for native error-state input harvest, Review/Save refusal, then successful read recovery preserving newly typed raw draft plus focus/caret/backward selection/input and body scroll. Before pure fix, same known issue showed 11/13 pass (focus could only fall back to body and error input remained disabled). After final freeze: **13/13 GREEN**, `/tmp/beamal-lesson-note-independent-final.log`, 0 fail/skip/cancel. No new blocker within this scope.

Verified production hashes at this run:
- `src.js`: `4269b00055249172c480802b78582acd557091b9dca9ca81718e2fef53354a38`
- `timetable-notes-ui.js`: `4a0261c46b723ac2ef34d66646bdc0dc2c37a2b40d754335d13b26be0887e5be`
- `api-client.js`: `4ec7f5acac7cceff78d661f2ce6f7350b07435940b5cac3fcb6f18547327cce4`
- `app.mjs`: `fe53ca0c6a171fdf4ba5f2991f8f8c1bd8356e0fc6a01c76190c56fc4eecd994`

Case 5's broad title refers to late note replies; its actual full-src assertions exercise pending save replies across route and identity changes. Actual SDK case12 independently covers both read and save invalidation. No real HTTP/DB/GUI verification is added by this final retest.

## Final screenshot-only visual review (2026-10-16)

I independently opened all six supplied JPGs with `view_image`; I did **not** operate the live GUI/browser, trigger save/restart/503, or rerun tests/build/database operations in this step. Screenshots are Root's captured runtime evidence. No visual blocking finding in these images.

- `teacher-review-390-zh.jpg`: modal fits narrow viewport, inner text has clear side padding; lesson/date/time and two-line multiline note readable; Close, Back and Save fully visible, footer not cut. No normal-state Retry button shown.
- `teacher-read-error-390-zh.jpg`: error and Retry visible above the lesson context; typed long note, selection and focused textarea visible; Cancel and disabled Review fully visible. The first text line is partly above the textarea's *internal* scroll position (later selected line is visible), not evidence of outer modal/page clipping. Screenshot alone cannot prove focus/caret persistence or scrolling behaviour; those remain the separate 13-case and Root runtime evidence.
- `admin-synced-768-en.jpg`: readable exact course/date/time/lesson context and same two-line note; labelled textarea has useful width/height; header and footer balanced, Cancel/Review visible, no unexpected Retry.
- `admin-clear-review-768-en.jpg`: clear operation explicitly states “Saving will clear this note”; empty note area reads as intentional alongside that warning; Back/Save and Close visible without overlap/crop.
- `teacher-after-restart-1280-en.jpg`: centred dialog, readable note with natural line wrapping and generous but bounded editing area; Close and Cancel/Review visible; normal Retry absent. Actual persistence/restart is Root's runtime claim, not newly executed by this reviewer.
- `student-private-safe-1280-zh.jpg`: visible Student Course cards and navigation have clean padding/alignment, course/student/date/teacher/attendance readable; no internal Note entry/content appears in the captured visible region. This screenshot supports that visible page only, not global/API privacy by itself.

The supplied `hidden-retry-before.jpg` was not used as current-pass evidence. The current six images match the reported hidden-Retry correction. Root's reported final full-suite/build results are not added to this reviewer's independently executed evidence.

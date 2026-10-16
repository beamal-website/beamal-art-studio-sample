# Exact lesson parent contact — local checkpoint, 2026-10-16

Scope: Timetable/Courses and their exact paid StudentSession contact continuation, after `bca00ed` on `test`. The narrowed goal remains incomplete. Other modules and the Goal definition were not changed.

## Source and delivered result

Original PDF page 3 and the local Notion snapshot lines 119–124 require Send Message to Parent from a student's lesson, editable content, Preview, WhatsApp/App channels and named teacher messages separate from system notifications. This delivery uses those source snapshots; it does not claim a fresh live SchoolTracs or Notion comparison. See `evidence/parent-contact-20261016/source-contract.md`.

- Admin or the current responsible Teacher opens the exact student's lesson-row menu → Send Message to Parent, chooses an available channel, writes text and previews the actual student, course, date/time, sender and recipient. Cancel returns to the same lesson, scroll position and original menu control. A read-only course grant alone does not authorize contact/send.
- WhatsApp uses only the recorded primary parent's name/number. The user may copy these details or manually open a valid international-number link with the reviewed text. Preview does not open another site, and no external send/delivery is claimed. Student email, a second emergency contact, matching names/phones and inferred country prefixes are not fallbacks.
- App-test send saves a real local message plus audit and retry receipt in one transaction. The exact linked Student account sees the message in Notifications with the authenticated Teacher's name and original lesson details. This is local test notification, not external push, email or a read receipt.
- The inbox requires both the original recipient account and its current explicit link to the same child. Removing that link revokes access; assigning a new account does not give it an old recipient's messages. A retained sibling link does not bypass this check.
- Native typing, radio choices, Preview/Back, keyboard focus, scrolling and bilingual responsive layout work without replacing the user's draft during background updates. Failed reads are unknown/error rather than empty data. Stale recipient/lesson details require explicit reload and another review. An uncertain send keeps the exact payload and operation key for safe retry; late navigation or identity responses cannot restore another user's private screen.
- System notifications have no authoritative reader in this slice and are explicitly shown as unavailable, not as a known-zero count. Reusable template management remains required future work.

## Verification

- Final required `npm test --prefix sample`: **1847/1847**, 0 fail/cancelled/skipped, 46.98 s. This working-tree count includes 15 pre-existing unrelated untracked staff-roster tests, which are not part of this commit.
- Final `npm run build --prefix sample`: passed, 6.66 s. The existing large-bundle warning remains.
- New formal tests include 10 server, 2 SDK, 14 controller and 18 pure UI cases. Existing full flows: 480/480. The flows harness imports the real controller and supplies its fake DOM/FormData context; existing assertions were not weakened.
- Independent acceptance: 18 semantic groups passed — 6 real HTTP/server, 5 actual controller/SDK and 7 actual complete-src integration groups. It covers exact same-name child isolation, unlink/reassignment, read-grant versus send authority, stale context, same-key concurrency, audit rollback, restart, malformed ACK/retry, late responses, native controls and return focus. Its controlled DOM is not presented as real browser evidence.
- Real in-app browser on isolated `127.0.0.1:64048/account`: Leo opened Chloe's Creative Drawing session for 2026-10-16 13:00. WhatsApp Preview showed the recorded primary parent; Cancel created zero messages/audits and restored the open row menu/focus. App Preview then sent the reviewed multiline body. Fresh Student login showed the same sender/student/course/time/body. Stopping and restarting the service with the same database retained the message.
- Real viewports checked: 390×844, 768×900 and 1280×900, Chinese and English; document width matched viewport width, no covered action or clipped message, mobile navigation collapsed on selection, and captured console errors/warnings were empty. The final desktop/mobile images were refreshed after the last static wording change. The independent reviewer inspected screenshots separately from their HTTP/controlled-DOM tests.
- Genuine defects found and fixed with preserved failing assertions included disabled native radio clicks, Preview not enabling after typing, radio focus returning to the wrong choice, Cancel returning into a closed row menu, a read-only Make Up entry regression, a background read preventing uncertain-send retry, hidden inbox reads delaying reentry and initial Loading not painting. Harness-only binding mistakes are not counted as product defects. Final static guards reject duplicate success labels and the false System known-zero wording.

## Data preservation and remaining scope

Before/after SQLite copies were compared row by row. All 50 old tables in the original user database remained unchanged, integrity passed and both new message/audit tables are empty there. In the isolated GUI database, old changes were only login sessions and one idempotent receipt; one new message and one audit row were created. Existing sessions for lessons, orders, attendance, prices, quotas, seats, Pending arrangements and Trial/public records stayed unchanged. No database was reset or reseeded.

Original service remains on `127.0.0.1:5180`; the separate GUI database is verification data. No external message was sent.

Still outstanding: reusable message templates, target selection/final confirmation for Make Up This Class, Absent follow-up lifecycle and remaining Timetable/Courses end-to-end acceptance. Absent correction/reopening policy and public Trial minimum required fields remain unanswered human decisions; no default was inferred. Package composition scheduling/consumption rules remain separate from saved descriptive segments.

This checkpoint is local work on `test`. No push or deployment is included; it is not completion of the whole Timetable/Courses goal.

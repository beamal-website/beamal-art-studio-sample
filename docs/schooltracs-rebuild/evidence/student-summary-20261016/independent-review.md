# Timetable paid-student summary and canonical attendance — independent review

2026-10-16. Baseline `test / 0c3a92974123a5d16194e081fa54b180837a693e`. **Limited PASS:18/18 independent host groups, no unresolved blocking finding.** No source, project document, database, Git or browser action by this reviewer; no full suite/build run. This is one UI slice, not all Timetable or Goal completion.

## Baseline and current evidence

- Genuine unchanged baseline source `/tmp/beamal-tt-student-summary-baseline-src.js`, harness `/tmp/beamal-tt-student-summary-baseline-harness.mjs`, expected-behavior script `/tmp/beamal-tt-student-summary-baseline-independent.mjs` and log `/tmp/beamal-tt-student-summary-baseline-independent-red.log`: **0/3 passed**. Each first establishes that the exact authorized batch person or exact canonical attendance exists, then fails at missing card name, unknown count instead of1, and no visible Absent in the roster. This is original source preserved before implementation, not a controlled inverse.
- Current script `/tmp/beamal-tt-student-summary-independent.mjs`, current harness `/tmp/beamal-tt-student-summary-current-harness.mjs`, latest final log `/tmp/beamal-tt-student-summary-independent-final-18-v2.log`: **18/18 passed**,0 failed/cancelled/skipped,695.82ms. Prior freeze log `/tmp/beamal-tt-student-summary-independent-final-18.log` remains historical evidence (1554.68ms). The original three assertions remain unchanged; additional groups exercise source and native delegated-event boundaries.
- Badge maker test file was independently executed:11/11. Additional original hostile/non-string/prototype/Unicode/injection checks passed in `/tmp/beamal-attendance-badge-independent.mjs` and `.log`. These are scoped component evidence, not extra live flows or a full-suite claim.

## Eighteen host groups checked

1. Cold card uses an already-authorized exact batch name without needing an opened roster.
2. Known paid count is1 from the batch source rather than unknown.
3. An existing canonical Absent is readable in the exact lesson roster.
4. Same visible names with two distinct IDs count2 and both appear; unsafe student text is escaped in actual card markup.
5. Same series different sequence, other series, moved effective date and an old roster cache cannot substitute another person's data.
6. Explicit students[] is known0; missing fact, loading, error or old window remains unknown and leaks no retained name.
7. Students preference controls summary; same-name legacy db.student/studentProfiles private notes, age and education never supply shared display data.
8. Age comes only from a valid supplied lesson-date age; missing, wrong-asOf, negative years or invalid months do not become0 or an old age. Age preference hides it.
9. Six exact canonical states plus explicit unmarked and unknown/malformed display separately.
10. Current window/identity key prevents old facts from being shown even before new data arrives.
11. Eight known people show three names and5 more, while total remains8.
12.0 years6 months remains valid; hiding status icons does not hide people/count, while hiding Students does.
13. Actual old pending success and503 after moving windows cannot overwrite an installed newer current result.
14. Actual role change and same-user access revision change clear facts; late pending read cannot repopulate them.
15. First-ever unchanged is rejected as unknown, then an explicit current empty response recovers to known0.
16. The roster action carries exact StudentSessionID; a native sick/remark/sticker draft survives batch refresh and Review. Final Save is disabled; Cancel returns canonical Absent, not the unsaved Sick. Only the batch read was made, and roster re-read returns the same canonical fixture.
17. Current-source503 hides retained names/count behind unknown with a generic error; successful recovery replaces them with the new current person.
18. Explicit authorized Teacher facts are usable, whereas Student is denied even with a forged same-key ready cache.

## Five-axis review

**Correctness — PASS for this scope.** Shared cards use the same current authorized batch source as C02, joined by schedule ID, occurrence sequence and effective date. Known empty versus unknown is maintained. The old card route through a getter without sequence is no longer used for shared summaries; the roster getter itself is not changed to guess a sequence. Six-state badges read canonical roster attendance only, never the open editor draft. Names are capped rather than letting every pupil inflate every card. Original actions, stable session IDs and existing return/controller guards remain in place.

**Simplicity — PASS.** One small preview formatter and the separate pure badge handle new display work. Existing view preferences, batch cache and roster actions are reused. No new fallback identity resolution, second student store or fee/capacity logic was added.

**Architecture — PASS.** This is readonly rendering of established filterFacts/roster DTOs. The new helper explicitly excludes Student accounts. The batch source remains authoritative for card people; a stale detailed roster cannot overwrite it. Existing canonical lesson controller still owns drafts/Review/Cancel, and final Save remains inert. No backend schema/API or eligibility policy changed.

**Privacy/security — PASS for changed surfaces.** Exact IDs/date/scope key are used; no name/email match, DOB, contact, family or salary source is added. Shared cards avoid legacy profiles. Native role/scope invalidation and old reply rejection are checked. Student text and translated badge labels are escaped; status CSS classes are a fixed whitelist and badges are noninteractive text. No external account or user DB was accessed.

**Performance — no source blocker.** No roster-per-card GET is introduced; new rendering reads the existing batch facts. Three names plus N more bound summary DOM. Matching is a local linear lookup in the current batch and is reused by existing layout computations; this is not a measured large-scale performance certificate. No new polling interval, storage or business mutation was added.

## CSS / visual and tool limits

Badge CSS has max-width100%, normal wrapping and overflow-wrap:anywhere. The host-scoped following action is displayed on a new line with8px gap. The final follow-up adds min-height44px/min-width44px, padding-inline8px and nowrap only to the existing Attendance action; the badge keeps normal wrapping. No maximum height or ellipsis truncation is introduced. Final source review and the screenshot-only follow-up below are distinct from live geometry, keyboard and scroll testing.

The first extended-harness run tried to assign the production const sharedClient and failed before exercising behavior; it was corrected to inject a real-shaped mutable client via the existing sharedApp harness. The initial Cancel fixture omitted lessonStudents, so the legitimate follow-up read became unavailable; it now supplies the actual expected canonical readonly response. These were test-model defects, not product findings, and no status/draft/late-reply assertion was weakened.

## Remaining scope

This slice does not provide persisted Remark/Sticker/showRemark, attendance saving, makeup eligibility, deductions, notifications or altered capacity/Full/Paid policy. The major-gap audit remains a historical baseline; its first recommendation is only partially addressed here by known people/count/age and canonical roster states. Follow-up/remark source work and complete StageA/full-system acceptance remain open.

Final hashes and script identity are recorded in `/tmp/beamal-timetable-student-summary-independent-manifest.json`.


## Final post-freeze verification and screenshot-only review

Root reported real mobile GUI exposed English Attendance breaking within a word and a37px action height. Final CSS uses8px inline padding, nowrap and44px minimum touch dimensions. The existing table remains min-width820px inside its own scroll wrapper; the126px cell has room for the fixed current English/Chinese action with reduced padding, while height can expand rather than clip. The badge itself retains wrap/anywhere. This scoped rule does not change generic buttons.

The English age formatter now chooses year/years and month/months independently. The original18 groups were rerun unchanged after this actual source change and all passed. A separate original probe exercises1year1month,2years1month,1year2months,0years1month and1year without a month suffix: all five pass (`/tmp/beamal-tt-student-summary-plural-independent.log`).

To verify the stated tiny post-freeze scope, reversing only the English plural expression reproduces the prior src.js hash exactly; removing only the four added CSS action declarations reproduces the prior CSS hash exactly; removing only the fresh-batch singular assertion line reproduces the prior flows hash exactly. No other change was hidden behind these updates. Prior and final hashes remain in the manifest.

Independently opened these seven actual final JPEG files through view_image and verified file dimensions: card1280en; roster390en/zh; roster768en/zh; roster1280en/zh, under `docs/schooltracs-rebuild/evidence/student-summary-20261016/`. Dimensions are respectively1280×900,390×844,768×1024,1280×900. **No blocking spacing, overlap or clipping issue is visible in these supplied images.**

- Card desktop: student name/known count and lesson-date age are readable within the card with surrounding spacing; the linked available-time card is visually separate. The inspected authorized card does not display DOB, contact or family fields; its pupil name and lesson-date age are the intended scoped data.
- Mobile roster: Not marked/未登記 and Attendance/登記出席 are readable and separated; the English action no longer splits. The roster is horizontally scrolled to Payment/Attendance, so intentionally hidden left columns and a partial right header are table viewport clipping, not evidence of page overflow. A partially scrolled information field in the Chinese picture is likewise not a new missing-label defect.
- Tablet/desktop roster: badge and action are readable with clear vertical separation. The tablet table retains its own visible horizontal scrollbar; wrapped Make Up This Class words belong to the separate preexisting column and are not the midword Attendance defect. No badge overlaps the action or adjacent row.

This is an independent screenshot-only visual critique, not this reviewer operating the live UI. Root's reported no-page-overflow/44px measurements, Sick draft→Review→Cancel retaining canonical Not marked, exact Escape return and full1431/build4.47s are separate author evidence, not independently performed here. Screenshots do not prove scrolling, keyboard behavior, save/persistence or the whole system. No extra full suite, build, browser or DB action was performed by this reviewer.

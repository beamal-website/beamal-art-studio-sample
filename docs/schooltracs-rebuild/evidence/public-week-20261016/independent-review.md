# Mixed public timetable — independent scoped acceptance

Date: 2026-10-16. Reviewer: staff_leave_host_map, independent of Root host and course_ui_map_v2 backend/pure renderer. Verdict: **PASS for reviewed source and targeted fixture/VM behavior; no unresolved blocking finding.** This is neither a whole-system completion declaration nor browser/layout acceptance.

## Evidence

- Maker backend tests rerun independently: **6/6**, `/tmp/beamal-public-mixed-backend-six-independent-rerun.log`.
- Separate original backend semantic groups: **3/3**, `/tmp/beamal-public-mixed-backend-independent.mjs` and `.log`. In-memory fixture DBs and ephemeral local HTTP only. Anonymous, Admin, Teacher and Student receive identical public DTO; Teacher/Student gain no private slot read. Aggregate = exact union of single-course public details across 7/8/14/30 windows, including same-time course collisions, empty windows and all-published options. Actual range helper covers low years, 1900/2000 leap distinction and 9999 clamping.
- Original mixed host groups: **16/16**, `/tmp/beamal-public-mixed-timetable-independent.mjs` and `/tmp/beamal-public-mixed-timetable-independent-16.log`.
- Separate pure renderer semantic groups: **7/7**, `/tmp/beamal-public-mixed-pure-independent.mjs` and `.log`.
- These totals are 26 original independent groups plus a rerun of 6 maker backend groups; parameterized assertions inside a group are not counted as separate tests. No complete npm suite or build was run by this reviewer.

## Host and data findings

1. `/schedule` obtains its own exact mixed source, rather than a directory or first-course fallback. Same display names and simultaneous slots remain separate by stable course/slot IDs.
2. Local type/course filters do not require network reads or writes. A selected course disappearing from the public response remains an explicit generic unavailable option, without retaining its old display name or silently becoming All courses.
3. Invalid native date is retained; old slot actions are suppressed. Reload uses canonical date, preserves explicit range and filters, and replaces prior conditional reads. Loading/error are not rendered as successful empty data.
4. Default range changes through polling, explicit override stays explicit, and first-ever unchanged is rejected. Old date success and pre-Reload failure do not overwrite new source. Partial weekly sections include every accepted date, including 8-day and 30-day ranges and the final-year clamp.
5. Mixed → exact second Course from week two → explicit Back and Browser Back retain range, exact filters, scroll and opener. Typed pending Trial state is discarded on navigation and late replies cannot revive it.
6. Direct mixed Trial reads the exact selected Course fresh. Native typed fields are not remounted by cosmetic color refresh. Hidden/moved/unavailable fresh source blocks review without discarding typed text. Normal native form review performs a fresh read, Back retains original strings, IME Escape is protected, and final submission remains disabled with no booking writes.
7. Admin global preview uses the same public aggregate and exact selected slot.courseId. Manage → Escape returns to the same filter/range. Anonymous forged management actions and wrong-course/filter-excluded Trial/Course payloads produce no private reads.
8. Linked source editing resolves second Course, sequence 2 and effective date exactly. Cancel returns to exact detail then preview. Canonical course/time/duration changes, including changes during asynchronous class-type preparation, prevent stale editor opening and refresh public preview with current public facts.
9. Identity changes invalidate mixed cache, preview, personal Trial draft and return ticket; late old-identity replies cannot restore any of them.

## Five-axis code review

- **Correctness:** PASS for the above boundaries. Reviewed the final canonical source guard against published/private/canonical course, date, time and duration before and after asynchronous open preparation. The additional source-drift fix originated from another reviewer/Root, not this reviewer; the final behavior was independently verified here.
- **Simplicity:** The shared public range/public-use predicate avoids divergent endpoint policies. Existing Class/Trial/Rescheduling helpers remain authoritative. Pure mixed renderer, one mixed cache and one explicit return ticket are a bounded addition; no new booking, payment or seat policy was inferred.
- **Architecture:** Public aggregate is one read transaction over one facts snapshot. Anonymous page and Admin preview consume the same public projection. Private details are fetched only after exact Admin management selection. Trial freshness uses exact Course public detail, not internal catalogue or a first-slot fallback. Existing host remains large; a broad refactor is outside this scoped review and is not a release blocker by itself.
- **Privacy:** PASS. Response whitelist and renderer omit contact details, student/family/order data, source schedule/resource/type IDs, private notes, private versions, rules and class counts. Public names are escaped and color CSS uses validated hex. Signed roles do not expand anonymous data. No new public mutation route or trial submission was added.
- **Performance:** No new per-course aggregate fetch loop: one snapshot produces all public courses/slots, with conditional revision and deduplicated active read. Pure rendering has bounded 7–30-day sections and keeps simultaneous cards. This is code/fixture review, not a scale benchmark or proof of browser responsiveness with all real data.

## Agreed source contract

`courses` intentionally contains **all globally published directory options**, including courses outside the requested date range. Their public name/color change legitimately changes the revision because those options remain visible. The legend includes only exact courses with currently shown slots. This differs from the initial research proposal; Root explicitly approved the implemented contract. It is not an outstanding bug.

## Non-blocking notes and limits

- No unresolved blocking or actionable non-blocking defect was identified in this scoped final review.
- Root owns full-suite/build and real GUI verification. This reviewer did not operate browser/IAB/Chrome, user DB or real data, and does not claim actual viewport layout, screen-reader behavior, keyboard interaction timing, native scroll physics or network performance proven by the VM model.
- CSS source uses scoped weekly/grid rules with desktop/tablet/mobile breakpoints; visual clipping/overlap needs Root's real screenshots/DOM evidence.
- Initial local test failures were test-model issues, not product RED evidence: native select value was not derived from selected option; an obsolete modal-root string was checked after whole-app replacement; one privacy regex matched a harmless CSS class rather than an action; and a drift case initially expected old detail instead of the now-agreed fresh-preview return. The final assertions preserve exact source/identity/no-write requirements. Linked source fixtures use valid 60-minute schedules; arbitrary 29-minute durations are tested separately as public standalone facts.
- Only `/tmp` scripts/reports/logs were created. No repository, Goal, AGENTS, Git index, real DB or browser state was modified by this reviewer.

## Effective-window GUI edge follow-up

Root discovered that a default-mode mixed window could enter a Course child with an omitted day override, then inherit a changed global default on return. Independently added host group16: start default-mode14 (`days:null`), use exact second-Course week-two opener, change global default to30 while in the child, return by both explicit Back and Browser Back. Child requests14, both return methods preserve14 complete dates through 2026-10-28, both filters, exact opener, window scroll and following poll. The ticket still records original default mode and effective range separately.

To verify the new case distinguishes the bug, made only temporary copies reverting Root's three assignments; the unchanged independent group failed at the exact child request (`undefined !== 14`): `/tmp/beamal-public-mixed-effective-window-independent-red.log`. Current source then passed all16 host groups: `/tmp/beamal-public-mixed-timetable-independent-16.log`. No repository source was reverted or modified. Source manifest refreshed after this check; original independent total is now26 (backend3 + pure7 + host16), plus maker backend6 rerun. Prior pure/backend source hashes remain unchanged. This follow-up does not claim actual GUI or complete build.

# Course introduction / recommended age — Stage A source contract
Date: 2026-10-16 (Hong Kong). Research only; writes limited to /tmp. No production, browser, DB, API or Git operations.

## Source evidence actually reopened
- Original PDF: /Users/yausiuhei/Downloads/Beamal web & app rough brainstorm remark (eileen.pdf
  SHA-256 rechecked: ffffe3efea424f501c13172e7ea9d80056a041158f3d4ed1e969de64b5d3a55e.
- Fully viewed p1 using the verified existing render; freshly rendered and fully viewed p9 at115dpi (/tmp/beamal-course-content-source-pdf/page-9.png).
- p1 explicitly shows Course detail / course content direction, recommended-age-like examples including Pre baby 2.5 years, per-lesson durations and package variants. A+Interview has60+30/90min×12 and60+60/120min×8. These are source examples, not mandatory defaults for the current six Courses.
- p9 is an existing Fees Edit screenshot despite handwritten “new course add/detail”; circles are Duration of a lesson (minutes) and No. of months in its Pricing model. It does not establish a separate course-level default duration, age eligibility rule or new content-publication workflow.
- Local Notion snapshot only: docs/schooltracs-rebuild/notion-requirements-source.md:3–5 records last edit2026-10-11 and capture2026-10-14. No claim of a fresh live Notion check.
- Same source:22/W-02 explicitly includes age, lesson length, course description, packages maintained in backend; :255–257 distinguishes saving content from publishing and leaves exact publication/channel states pending.
- Goal:200–206 requires course content/age, distinct Course/Fee, package components/durations and sensible General grouping.
- PDF comparison:13,46–48,127–128,147–148 records age conflicts between p1/p4 and40/45-minute disagreement. Do not convert contradictory examples into enrollment gates. Mock cohort3–18 is not a permanent minimum age.

## Current canonical fields: absent, not merely hidden
- sample/server/validation.mjs:12,79–92: Course metadata permits courseName/category/level/publicColor/classType; duration is handled by validatePricing(:34–50), and only monthly-lessons requires it.
- sample/server/store.mjs:21 metadata has no introductions/recommended ages. parseCourse(:142–148) flattens pricing from fees[0] for compatibility; this primary-fee duration is not proof of a unique Course duration.
- sample/server/available-slots.mjs:104 courseDTO whitelists onlyid/courseName/category/level/publicColor; publicSlot(:103) has its exactslot duration.
- sample/client/availability-ui.js:60 courseMeta displays category/level, publicCourseDetailsMarkup around:100 displays current public course metadata and slots.
- sample/src.js:1472 openCourseMetadataEditor /:1518 saveCourseMetadata /:1682 portalCourseDetail are existing management anchors. Legacy staticcourses near:96 includes age and bilingual sampledescriptions; it is not a canonical source and must never backfill these newfields.
- No existing Course introduction/recommendedAge persistence, revision semantics or contentpublication field was found in these data paths.

## Proposed narrow data contract (design choice, not PDF field names)
For the exactCourse only:
- introductionZh: string | null
- introductionEn: string | null
- recommendedAgeMin: number | null
- recommendedAgeMax: number | null

Use separate read readiness/error outside the content values (for example sourceStatus) so unknown source is distinguishable from a successfully read record with deliberately blank optional fields. Do not manufacture a saved contentrecord to make the UI look populated. No images, uploads, syllabus list, topics or new eligibility policy needed in this slice.

Introductions:
- Two optional plain-text textareas; neither language is mandatory just because the UI is bilingual.
- Preserve paragraphs/newlines and original input during editing; escape on display. No raw HTML or automatic translation/copy to the other language.
- In a locale without text, say that introduction is not provided; do not silently display or store a fabricated translation. An explicitly labelled other-language view can be a later presentation choice.
- A technical lengthlimit may protect the form, but is not a new business-required field or publication policy.

Recommended ages:
- Optional finite non-negative numbers, including2.5. Empty input means no supplied bound, never0.
- If both supplied, min<=max. Accept one-sided range; do not force both, do not require integer ages and do not clamp to mock3–18.
- Prefer step=any (or an explicit decimal text parser) rather than a half-year-only restriction not stated by source. Do not round/truncate2.5; reject nonfinite/negative/inverted values with field-specific errors and retain the raw input.
- Both bounds absent: “未提供 / Not provided,” not “all ages/no restrictions.”
- Minimum only: “建議2.5歲或以上 / Recommended ages2.5+”; maximumonly likewise; both label explicitly “建議年齡 / Recommended ages.”
- These fields are display guidance. They must not hideSlots, rejectTrial/enrollment, calculatechildeligibility, modifyClassType, changeCapacity or imply an approved exception policy.
- Do not derive ages from Level, currentstudents' birthdays, Course name, static legacyage strings or the PDF examples.

## Duration: do not add an editable course-level default now
The source supports durations at Fee/per-lesson, actualschedule/Slot and packagecomponent levels; it does not settle one Course-wide duration overridingall.
- Management Course view can point to its namedFee(s) / schedule or show explicitly labelled values from each verifiedsource.
- PublicSlot keeps its exactduration. A Fee's duration must be labelled as that Fee's per-lesson duration.
- Fixedmonthly/package with no per-lesson duration is unknown; do not copy anotherFee's60min.
- packageTotal=720minutes is a totalquota, not a lesson duration.60+30/60+60 draftcomponents are not savedcanonical course duration.
- Do not use fees[0], average/min/max of partialschedules, currentpublicfirstslot or a global60-minute default as “Course duration.”
- A future canonical general teaching-duration field would need an explicit precedence/ownership decision; it is not necessary for this Stage A introduction/age form.

## Recommended UI location and workflow
- Existing Course detail → General: one compact “課程介紹 / Course introduction” area with the current locale text, recommended-age line and Admin Edit entry. Keep Schedule/Fees useful, not displaced by a longunbounded introduction; use readable wrapping and optional longtext expansion.
- Reuse exactCourse ID/version and existing Course return context, not a new top-level navigation item or Timetable setting.
- StageA editor can be a bounded course-content dialog from this area: two language textareas + optional agebounds → Review → Back preservingrawdraft → Cancel/X/Escape return sameGeneral section/focus/scroll.
- Teacher gets authorized read-only content; do not infer editrights from being able to view a Course.
- Current genuine metadataSave handles name/category/color/classType. Until newfields have a real savecontract, do not silently append unsupportedinputs to it or claim they saved; keep this newdraft Review/finalSave disabled with a small relevant explanation. Do not mutate the Courseobject or leak the draftinto another Course/publiccache.

## Publication boundary / future public view
- Existing publicvisibility is known and Slot-derived: available-slots.mjs:101–109 publishes course membership only when suitablepublishedSlots exist; this is not a general Coursecontent publishingstate.
- There is no canonical contentPublished/publicationStatus/channel flag for the proposedfields. Unknown must remainunknown, not false, true, “draft saved,” or “already published.”
- Do not autoPublish a privateCourse because contentwas edited; do not assume saving content authorizes Website+StudentPortal exposure.
- Future publicread uses an explicit whitelist of these approvedpublicfields and the exactCourseID, below course title/meta and before time selection. Keep existinganonymousprojection/privacy unchanged until the correspondingpubliccontract is intentionally adopted.
- Internal draft preview is not a publicpublication. No private schedule/resource IDs, persondata, notes, feesrawsnapshots or unpublisheddraft should be spread into public DTOs.

## Meaningful Stage A acceptance boundaries
1. CourseB (same name asA) keeps its own two introductions/2.5–5age; edit/review/back/cancel never borrowsA.
2. Unknownsource, knownblank,0, one-sidedbounds and2.5 remain distinct; malformednumbers/invertedrange retaininput and blockReview.
3. Longbilingual text/newlines/XSS render safely at390/768/1280; bodykeyboardscroll, footer and returnfocus work.
4. WrongCourse, deletedrecord, role/revisionchange or staleasyncsource cannot restore an old private draft.
5. Two Fees with60/120 durations and package720minutes never collapse to one course duration or enrollmentagegate.
6. Opening/editing/reviewing changes noFee, pricinghistory, packagecomponents, order snapshot, schedule, Capacity, publication or businessrecords.
7. Publicstill consumes only its suppliedsafeDTO; absence of contentpermission/fields cannot fall back to legacyage, privatecontent or currenteditor draft.

## Concrete unresolved choices (do not block the read/edit/review UI)
- Final persistence/publication owner and versioning; exact supportedchannels and save/publish workflow.
- Whether any future explicit ageeligibility policy exists separately fromrecommendeddisplay.
- Whether an explicit Course-level generalduration is needed and how it relates to Fee/schedule/componentdurations.
- Exactreal content/age mappings for the current sixCourses; originalconflicting examples must not be autoimported.

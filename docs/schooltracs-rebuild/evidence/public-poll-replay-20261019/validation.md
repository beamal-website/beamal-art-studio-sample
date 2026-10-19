# Public course polling animation replay — 2026-10-19

## Cause and change

The public catalogue-only course fallback (including Pre-Baby before public trial times exist) treated every repeated 404 as new visible data. The five-second polling chain called refreshPublicAvailability, then paintPublicAvailability and render, replacing main and restarting the shared appear animation.

The fallback now compares readiness, error recovery, catalogue-only mode, prior course/slots and date range before marking the view dirty. Identical results retain the existing page; meaningful changes still paint. The first-entry animation CSS is unchanged.

## Verification

- Before fix: real refresh chain in a deterministic test replaced main three times for three identical fallback replies. The regression failed 3 != 0.
- After fix: same test passes with zero replacements, retaining the focused control and business records.
- Companion regression covers error recovery, date changes, a course becoming published and returning to catalogue-only status. Each visible change still paints once; repeated identical replies do not.
- Full shared working-tree npm test --prefix sample: 2,006/2,006 passed. Isolated staged-source focused polling tests: 3/3 passed. Isolated npm run build --prefix sample passed.
- Real browser Pre-Baby page observed for eight 1.5-second batches (more than two polling periods): zero main replacements, zero heading movement and transform none in every batch. See browser-measurements.json and stable-page.png.
- Local API was not running; restarted the existing SQLite-backed service on 5180 with empty seed lists. No course, trial slot or booking was created for verification.

Concurrent workspace edits are excluded from this commit.

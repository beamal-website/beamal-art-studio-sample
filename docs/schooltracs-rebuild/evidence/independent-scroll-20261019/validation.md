# Independent portal scrolling

Local browser verification on 2026-10-19, existing admin account and database.

Desktop portal shell is bounded to the viewport below its existing 76px header. Navigation and content have independent vertical overflow with scroll chaining contained. Navigation entries retain their natural size. Mobile and print layouts are excluded.

Observed at 1092 × 952:
- Document height stays 952px and window scroll stays zero.
- Scrolling the navigation moves its scrollTop from 0 to 56 while content stays at 0.
- Scrolling the right timetable moves content to 71 while navigation remains at 56.
- On the longer Students page, content scrolls to 1654.5 while navigation remains at 56 and window remains at zero.
- Timetable internal scrolling still reaches the final 19:45 row.
- At 1440 × 800 with navigation collapsed, navigation remains independently scrollable (724px viewport, 932px content).
- At 320px and 768px widths, document width matches the viewport and the original mobile content flow remains active.

`timetable.png` shows the left navigation scrolled to Settings while the right timetable is scrolled to its final time row.

Validation: all 1,985 tests passed with `npm test --prefix sample -- --test-concurrency=4`; `npm run build --prefix sample` passed (existing large-chunk advisory only).

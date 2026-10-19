# Timetable bottom alignment regression check

2026-10-19, local Vite preview, authenticated admin, existing database unchanged.

At 1600 × 850, scrolling the outer page to the bottom reproduced the reported blank band: the navigation ended at y=850 but the timetable ended at y=709 (141px gap). The timetable workspace had a fixed viewport-derived height, while the portal column stretched to the taller navigation.

The desktop timetable now fills its portal column using a vertical flex layout, allowing its workspace to grow beyond its existing minimum height. Its own grid and resource sidebar retain independent scrolling. Mobile and print rules are excluded.

Browser checks after the fix:
- At the same outer-page scroll position, workspace and portal content both end at y=850.
- Scrolling the grid to its end exposes the final 19:45 row completely; its bottom is y=850.
- The resource sidebar can reach its final advanced filters control.
- Month, list and custom range workspace bottoms align with the portal content bottom.
- Collapsing and reopening the main navigation retains alignment.
- At 390 × 844, document width is 390px, the resource panel retains its mobile grid layout, and the timetable retains its 520px internal scroll area.

`bottom.png` shows the desktop grid scrolled to the final time row without the former blank band.

Validation: `npm test --prefix sample -- --test-concurrency=4` passed all 1,985 tests. `npm run build --prefix sample` passed (existing large-chunk advisory only).

# Collapsible display groups with transparent visibility icons

Local browser checks on 2026-10-19; existing data and visibility preferences preserved.

Display, Room, Teacher and Class type now use native disclosures, expanded initially. Each has an independent open state retained across a filter redraw. The default resource checkboxes are removed; the existing visibility eyes remain the sole per-resource show/hide control. Old checkbox selections no longer filter lessons, preventing invisible leftover restrictions. Class-type selection and Advanced filters retain their existing functions.

Resource eye buttons have transparent backgrounds, no border or shadow, and a visible keyboard focus outline. Their 44px click areas and accessible show/hide descriptions remain intact.

Browser verification:
- Zero checkbox inputs inside Display; computed eye background is rgba(0, 0, 0, 0).
- Room can be collapsed while Teacher remains open. Hiding and restoring Maya through the eye preserves the collapsed Room group.
- Collapsing Class type hides its selector. Closing and reopening Display by keyboard preserves the Class type group's own state.
- Closed Display measures 60px tall rather than retaining the former resource panel minimum height.
- English and Chinese labels, keyboard toggling, and 390px mobile layout verified.
- After returning from mobile to desktop, document and viewport both measure 952px tall, with the portal ending at y=952. The hidden selector label is anchored inside its own field to avoid introducing outer-page overflow.

Evidence: desktop.png shows the expanded desktop groups; mobile-collapsed.png shows Teacher collapsed on mobile.

Validation: the two new behavioral cases failed before implementation and passed after. Clean staged snapshot passed six focused cases covering visibility, retired selections, independent disclosure state, month filtering, range filtering and group placement. Production build passed. The initial full run passed 1,988 of 1,990 tests: an old Month test still expected the removed checkbox filter and was updated to use the visibility filter (focused rerun passed); a file-type inspection test failed during repeated upload handling. All 25 attachment tests passed in an independent rerun. Full-suite reruns under load continued to exhibit that attachment failure; it is not represented as a clean all-green suite.

The completed full rerun reported 1,986 passes and five failures out of 1,991: the same repeated-upload inspection case plus four product preview/source-state cases in concurrently edited areas. The standalone current-working-tree flow suite reported 513 passes and one product preview failure (Create product label). None of these reported failures exercised the changed Display sidebar.

Final isolated validation: all 496 flow tests in the staged snapshot passed, including the updated Month behavior; its final build also passed after the collapsed-panel minimum-height fix.

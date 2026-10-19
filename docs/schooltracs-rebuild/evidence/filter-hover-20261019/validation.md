# Filter row hover — 2026-10-19

- Default Room/Teacher/Class rows and saved Advanced filters share a pale green whole-row hover background. No border or inset shadow. Eye buttons retain transparent backgrounds.
- Keyboard focus within a row gets the same background cue. The hover rule is limited to devices supporting hover, and does not change row dimensions on entry.
- Browser checks: Room and temporary custom-filter rows computed background rgb(226,239,234), border 0px, box-shadow none while hovered. The highlight encloses both the name and eye. Screenshots record the final borderless appearance.
- Temporary custom filter was removed after verification; original display preferences retained. No business data changed.
- Full working-tree suite: 2,002 passed and one attachment file-identification failure (INVALID_ATTACHMENT); the failing test passed alone on retry. Isolated build with the final staged CSS passed. Concurrent changes are excluded.

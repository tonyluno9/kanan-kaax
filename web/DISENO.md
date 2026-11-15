# Burn Calendar · design direction

**North star:** an Earth-observation instrument built by the best product studio in the world. Dark, precise, calm. The night planet is the canvas and fire is the only warm colour. Anyone gets the answer in 10 seconds; the expert finds the evidence in 2 clicks.

- **Style** (ui-ux-pro-max, query "scientific data dashboard satellite map dark mode"): *Data-Dense Dashboard* in dark mode, with visible focus, 4.5:1 text, reduced motion, SVG icons and no emoji. We kept its checklist and dropped its blue/amber palette, because blue would compete with the viridis data.
- **Colour:** night surfaces `#05070D → #18213A`, hairlines at 8 % and 14 % white. Ember `#FF6B2C` (gradient `#FFB347 → #C2361B`) is the only accent: selection, critical season, primary actions. Viridis is used only for data, never for decoration. Status colours (`ok / warn / bad / info`) appear only in the "how is this year going" badge.
- **Type:** Geist for the interface, Geist Mono for every number, date, coordinate, axis and kicker (tabular figures, so numbers that count up do not jitter), and Instrument Serif only for the three big moments: the hero, the place name and each card's answer.
- **Layout:** full-bleed map with a floating glass bar and a floating glass sheet (420 / 360 px, bottom sheet on mobile). Only those two surfaces use blur, to keep the map sharp. Map framing leaves the sheet's space free.
- **Tokens** (design-system, 3 layers) are in `css/tokens.css` and the components in `css/app.css`. We used no Tailwind and no build step: the ui-styling patterns (segmented control, tabs with a sliding indicator, sheet, tooltip) are written in plain CSS.
- **Motion:** 150–280 ms with `cubic-bezier(.2,.8,.2,1)`. Charts draw themselves and numbers count up. The cinematic entry (~2.5 s) can be skipped and is turned off under `prefers-reduced-motion`.
- **Brand:** the isotype is a flame cut out of a 3×3 calendar grid (see `js/iconos.js`, `favicon.svg`). The voice is short, plain and second person, with no hype words; the meaning of every text is unchanged.
- **Projector:** at ≥1800 px the base size and the sheet grow, so the place name and answers can be read from the back of the room.

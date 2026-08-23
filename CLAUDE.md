# Cropped Puffer — single-page storefront

One full-screen React page for a single product, shown in five colourways. No
routing, no backend: the whole thing is one hero screen driven by React state.

## Stack

React 18 + Vite, CSS Modules, Framer Motion. `npm run dev`, `npm run build`.

## The layout

The screen is `100vw × 100vh` with `overflow: hidden`; its background colour is
what changes between colourways.

- **Header** — the product name (`CROPPED PUFFER`), a pill nav whose white
  indicator slides between items, and cart / wishlist buttons. The cart shows a
  count and opens a drawer down the right edge.
- **Left column** (`HeroSection`) — voice only: an eyebrow, a two-word display
  lockup with the second word drawn as an outline, and one line of facts.
- **Centre** (`ProductStand`) — the jacket over two concentric hairline rings,
  with a `Buy it` button below.
- **Right column** (`PurchasePanel`) — a card of hard facts: price, size,
  colour, fill. Values that change with the colourway animate in and out.
- **Corners** — the arrow control bottom-left, the next colourway's thumbnail
  bottom-right. They mirror each other: what you press, and what it brings in.

## The swap

Clicking an arrow moves one place along the sequence — linear, not a loop, and
`isAnimating` ignores clicks while one is in flight.

The two jackets ride a single diagonal with a docking slot at each end: the
corner thumbnail below right, the first nav item above. Forward, the outgoing
jacket rides up into the nav and the next grows out of the thumbnail; back, it
runs exactly in reverse. **The path is measured, never hardcoded** —
`getBoundingClientRect()` on the stage, the thumbnail and the nav item at click
time gives the offsets and the scale, so it stays exact at any viewport size.
Because both images are `object-fit: contain`, the scale compares the *fitted*
rects, not the boxes.

The background and text colours ride CSS custom properties with their own
150ms-delayed transition, so the colour change trails the departing jacket by a
beat, independent of Framer Motion.

Two things that look like polish but are load-bearing:

- **The corner hand-over is a swap under cover, not a cross-fade.** Two copies
  of one image at opacity `a` and `b` composite to `1-(1-a)(1-b)` — about 0.75
  at the midpoint — so a cross-fade washes out and then snaps back to solid.
- **Only one element casts a shadow at a time.** While a landed jacket sits on
  the thumbnail, the thumbnail drops its own shadow; stacking the two darkens
  the spot and then lightens it again, which reads as a single heartbeat.

## Colourways

`src/themeStates.js` is the whole sequence, ordered light to dark. Each entry
carries its image, price, background, text and lighting values. Add an entry and
the arrows, the corner preview, the counter and the transitions all pick it up.

## Images

All five colourways are **recoloured from one photograph** by
`npm run jackets` (`scripts/prepare-jackets.mjs`), reading
`assets-source/jacket-source.png`. Black cloth carries no hue to rotate, so each
variant treats the photograph's luminance as a shading map and paints it onto a
target colour, keeping highlights white because a highlight is the colour of the
light, not the cloth.

The script also rebuilds alpha for sources that arrive without it, in four
modes: `alpha` (the file already has it), `checker` (a transparency
checkerboard baked into a JPEG), `plain` (a real studio backdrop) and `noisy`
(transparency flattened into speckle).

**Keep `assets-source/` — the colourways cannot be regenerated without it.**
`src/assets/*.png` are generated but committed, so a fresh clone runs without
having to build them first.

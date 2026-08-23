# Prompt for Claude Code — Jacket Masters Hero Page (React, single page)

Copy everything below into Claude Code in VS Code.

---

I want to build a **single full-screen page** for a puffer jacket store called **"Jacket Masters"** using React. One page only — no routing, no other screens. The whole thing is one hero screen that fills the viewport, and its signature feature is the animated jacket swap described below.

## Tech stack

- React 18 with Vite (`npm create vite@latest`)
- Styled Components or CSS Modules for styling (pick whichever is cleaner — your call)
- Framer Motion for the coordinated enter/exit animation described below
- No routing, no backend, no database — a static single page driven by React state

## Exact page design

The page is **full-screen** — it fills the entire viewport (100vw × 100vh), no outer frame, no rounded corners, no page scrolling. The whole viewport IS the screen, and its background color is what changes between themes.

Inside it:

### 1. Header (top of the screen)
- Left: a small square logo mark with the letters "JM", next to the text "JACKET MASTERS" in a bold, wide-letter-spaced font
- Center: a pill-shaped navigation bar with a semi-transparent dark background, containing 4 items: "PUFFER JACKET" (shown as an active white pill), "ALL PRODUCTS", "ABOUT US", "CONTACT"
- Right: two circular icon buttons (cart and wishlist/heart)

### 2. Main section (three areas side by side)
- **Left column:** two small circular arrow buttons (prev/next) above everything. Below that, a large two-line heading "Stand out / Without trying" in a bold display font. Below that, a short description paragraph in a muted/lighter color. Below that, a white pill-shaped CTA button "Get the look >"
- **Center column:** the jacket photo floating in the middle with a soft blurred shadow beneath it (looks like it's hovering), and below the photo a small centered two-line caption: "Confidence, / wrapped in warmth"
- **Right column:** at top, the new price in large bold text "$149", below it the old price with a strikethrough "$199". Further down, a small label "Choose your size:" and three circular size buttons (36 active/white, 38 and 40 inactive/dark)

### 3. Bottom-right corner of the screen
A small floating thumbnail photo of a jacket in a **different color** — this is the "next" jacket waiting in the wings. It sits absolutely positioned in the bottom-right corner of the screen, above the footer, at roughly a quarter of the main jacket's size, with its own small drop shadow.

### 4. Footer (bottom of the screen)
Social media icons (Instagram, Facebook, Dribbble, Behance) on the left

## Required animation behavior (this is the most important part)

There are two jacket images on screen at all times: the **big one in the center** and the **small thumbnail in the bottom-right corner**. The transition is a physical **swap between these two**, not a color fade and not a slide of a single image.

**On clicking the right arrow button (next), in this exact order:**

1. The **big jacket currently in the center exits along the exact same diagonal line that the incoming jacket travels on, just mirrored** — it moves up and to the left, toward the top-left corner, shrinking down to about 30% scale as it goes (exactly the reverse of how the incoming one grows from 30% to full size). It must go **completely out of the screen's top-left edge** — not a small nudge; by the end of the animation it is fully clipped away and invisible. Roughly 700ms with an accelerating (ease-in) curve. Note the screen has `overflow: hidden`, so the jacket is clipped by the screen edge as it leaves — that's the intended look. The visual effect is a single continuous diagonal conveyor: one jacket rides up-left out of frame while the next rides in from the bottom-right along the same line.
2. About **150ms after the exit begins**, the **page background color** starts its own smooth transition to the next theme's color — so the jacket leaving leads, and the background color change follows a beat later, giving a staggered, layered feel. Text colors (heading, paragraph, price, caption) transition along with the background to preserve contrast (on a dark background, text becomes light).
3. About **320ms in** (while the outgoing jacket is still on its way out — the two motions overlap), the **replacement jacket flies in from the bottom-right thumbnail position** into the center: it starts small (about 30% scale) at the bottom-right corner where the thumbnail sits, then animates to full size in the exact center of the stage, with a decelerating (ease-out / spring-like) curve over ~700ms, fading in as it travels. It ends perfectly centered at the same size and position the previous jacket occupied.
4. Once the incoming jacket has landed, the **bottom-right thumbnail updates** to preview the *next* color in the sequence (so there's always a preview of what's coming).
5. The white CTA button and the size selector buttons keep their fixed white styling — they already have their own contrast and never change.

There are **three color themes**, stepped through in order via the right arrow:
1. Light gray (default state) — light gray jacket, light gray page background, dark text
2. Dark red — deep red/maroon jacket, dark red page background, light text
3. Black/dark — near-black jacket with a subtle sheen, near-black page background, white text

**On clicking the left arrow button (prev):** the same swap runs in reverse — the center jacket exits **downward** (down and drifting right, fully out of the screen's bottom edge), the background transitions back to the previous theme a beat later, and the previous color's jacket flies in from the corner to the center.

When the last state (black) is reached, the right arrow becomes disabled (or reduced opacity). When the first state (light gray) is reached, the left arrow becomes disabled. This is a **linear sequence, not an infinite loop**.

Also: **guard against rapid clicking** — while a swap animation is in flight, ignore further arrow clicks (a simple `isAnimating` boolean in state) so the two jackets can't get out of sync.

## Technical implementation details expected

- Keep the current theme index in `useState` (an index from 0 to 2), plus an `isAnimating` boolean guard
- Use Framer Motion's `AnimatePresence` with `mode="popLayout"` (or a custom key-based swap) so the exiting jacket and the entering jacket can animate simultaneously — the exit and the enter overlap in time, they are not sequential with a gap
- **Do not hardcode the travel distance.** Measure it at runtime: take `getBoundingClientRect()` of the center jacket container and of the corner thumbnail, compute `dx`/`dy` between their centers and `scale = thumbWidth / centerWidth`. The enter variant starts at exactly `{ x: dx, y: dy, scale }` (so the incoming jacket appears to *be* the thumbnail growing into place) and the exit variant ends at the mirrored `{ x: -dx * 1.9, y: -dy * 1.9, scale }` (the extra 1.9 factor pushes it fully off screen). For "prev", swap the signs of both. This keeps the path exact at every screen size.
- Handle the screen background and text color transitions via CSS custom properties (CSS variables) updated from state and transitioned with plain CSS `transition`, so the color change is independent of the Framer Motion jacket animation and can carry its own 150ms delay
- Split into components under `src/components/`: `Header.jsx`, `HeroSection.jsx` (left column with heading, text, arrows and CTA), `ProductStand.jsx` (center section with the swapping jacket), `PurchasePanel.jsx` (right column with price and size), `ColorThumbnail.jsx` (the bottom-right preview), `Footer.jsx`
- Define each theme's data (background color, text color, jacket image path) in a separate array in a `themeStates.js` file, so adding more themes later is easy
- I will place three jacket PNGs (transparent background) in `src/assets/`, named `jacket-gray.png`, `jacket-red.png`, `jacket-black.png`
- The design must be responsive; on mobile, the three-column layout should stack vertically, and the corner thumbnail can be hidden

Please first outline the folder structure and the required `package.json` dependencies, then write the components one by one.

---

Note: add the three jacket PNGs into `src/assets/` yourself afterward (or ask Claude Code to scaffold placeholders until you provide them).

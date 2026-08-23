// One shared timeline so the stagger stays in sync everywhere.
export const TIMING = {
  exitDuration: 0.7,
  // Kept short: this is how long the next colourway waits before setting off,
  // and any longer reads as the new colour arriving late. The exit still runs
  // 0.7s, so the two jackets overlap for most of the trip.
  enterDelay: 0.2,
  enterDuration: 0.7,
  // The background colour change is delayed in CSS (see App.module.css).
  backgroundDelayMs: 150,
}

// The jacket rides one diagonal conveyor with a docking slot at each end:
// the corner thumbnail at the bottom right, the "PUFFER JACKET" nav item at the
// top. It never shoots off screen -- it shrinks into whichever slot it is
// heading for and hands over there.

// Going back, the jacket lands in the corner slot on top of the thumbnail and
// is then simply removed. It stays fully opaque the whole way: cross-fading it
// with the thumbnail would NOT hold a constant image, because two copies of the
// same artwork at opacity a and b composite to 1-(1-a)(1-b) -- ~0.75 at the
// midpoint -- so the pair washes out and then snaps back to solid. Instead the
// thumbnail turns fully opaque underneath at this point in the trip, by which
// the ease-out-expo move is within a fraction of a pixel of its destination, so
// the two are pixel-identical and removing the top one is invisible.
export const HANDOVER = 0.92

// Going forward, the jacket docks into the nav item with nothing underneath to
// take over, so there it really does fade -- from this point on the trip.
export const NAV_FADE = 0.78

// Going forward, the corner returns with a colour that was not there before,
// so it genuinely fades in rather than being swapped under cover.
export const THUMB_FADE_S = 0.3

// Where along the nav item the jacket aims, as a fraction of its width:
// 0 is the left edge of the label, 0.5 its centre. Negative nudges it further
// left, past the start of the pill.
export const NAV_ANCHOR = -0.2

// Fallback aspect ratio, used only if the thumbnail image has not decoded yet
// when the first swap fires. Real value is read from the PNG at run time.
export const JACKET_RATIO = 640 / 820

// When the outgoing jacket is actually removed from the DOM.
export const EXIT_MS = TIMING.exitDuration * 1000

export const SWAP_MS = (TIMING.enterDelay + TIMING.enterDuration) * 1000

// When the corner is free again on the way forward, and so when the next
// colourway can be previewed there. The incoming jacket only sits in that slot
// until `enterDelay`, and an ease-out-expo move clears it almost immediately
// after -- waiting for the whole swap to finish just makes the preview late.
export const PREVIEW_MS = (TIMING.enterDelay + TIMING.enterDuration * 0.25) * 1000
export const HANDOVER_MS = TIMING.exitDuration * HANDOVER * 1000

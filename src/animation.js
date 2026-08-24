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

// The jacket rides one diagonal conveyor between the corner thumbnail at the
// bottom right and the top edge of the screen. Downward it docks: it shrinks
// onto the thumbnail and hands over there. Upward it simply leaves, shrinking
// away up the diagonal and out of the frame.

// Going back, the jacket lands in the corner slot and stays fully opaque the
// whole way: cross-fading it with the thumbnail would NOT hold a constant
// image, because two copies of the same artwork at opacity a and b composite to
// 1-(1-a)(1-b) -- ~0.75 at the midpoint -- so the pair washes out and then snaps
// back to solid. The thumbnail is put back on the frame the jacket is removed
// instead, so only one of them is ever in that corner.

// Nothing fades on the upper leg, in either direction. `.screen` is already
// `overflow: hidden`, so the edge of the screen ends the jacket by itself --
// adding a fade on top of that was a second mechanism doing the same job, and
// the two had to agree about *when* the crossing happens.
//
// They could not stay agreed. The crossing point is a function of NAV_ANCHOR:
// move the aim and the jacket leaves through a different part of the edge, at a
// different moment, so every hardcoded fade window is stale the moment the
// diagonal is re-aimed -- and a fade tuned for the old path has the arriving
// jacket coming up mid-air rather than at the edge it actually crosses. Letting
// the clip do it is exact at any anchor, and mirrors for free.

// Going forward, the corner returns with a colour that was not there before,
// so it genuinely fades in rather than being swapped under cover.
export const THUMB_FADE_S = 0.3

// Going back, nothing is covering the corner when the swap starts, so it has to
// fade out under its own steam before the jacket gets there.
export const THUMB_FADE_OUT_S = 0.2

// And when the image behind it is changed -- once that fade-out has finished,
// so it happens unseen. It must NOT happen on the hand-over frame: swapping an
// `img`'s `src` throws away the bitmap it is showing, and the replacement is
// several hundred KB of PNG that may not be ready in the same frame. Landing
// that on the one frame the flying jacket is removed empties the corner
// completely. Doing it here leaves most of the exit for the decode.
export const CORNER_SWAP_MS = THUMB_FADE_OUT_S * 1000 + 60

// The sideways aim on the way out, as a fraction of the first nav item's
// width: 0 is the left edge of its label, 0.5 its centre. Negative carries the
// jacket further left, past the start of the pill. The jacket no longer stops
// there -- this only sets how slanted the diagonal out of the frame is.
//
// One step further left than the nav item's own width, so the climb leans a
// little more across the screen instead of going up almost square. The arriving
// jacket reads the same number, so the two legs stay one straight line.
export const NAV_ANCHOR = -2.1

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

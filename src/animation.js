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

// On the upper leg the jacket fades as it crosses the top edge, rather than
// dissolving on the spot or being cut off by the frame at full strength.
//
// The two windows are not mirror images of each other, because the easing is
// not symmetric in time: everything here eases *out*, so both jackets cover
// most of the distance in the first fraction of the trip.
//
// Leaving, the top of the jacket reaches the edge about 68% of the way along
// the path and the last of it clears at about 98%; under ease-out-expo those
// land at roughly a fifth and a half of the duration.
export const EDGE_FADE = [0.2, 0.52]

// Arriving, the same two points are about 4% and 40% of the path -- which the
// same curve reaches in the first breath of the move. So the fade in is quick:
// any longer and the jacket is solidly inside the frame while still half there.
//
// Both of these are `[start, end]` windows in *time*, as a fraction of the
// leg's duration -- not single numbers. Read one as a scalar and the arithmetic
// silently becomes NaN, which Framer Motion turns into an opacity that never
// animates: the whole return leg then has the jacket arrive invisible.
export const ENTER_FADE = [0, 0.1]

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
export const NAV_ANCHOR = -1.6

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

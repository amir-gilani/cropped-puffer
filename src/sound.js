/**
 * The confirmation tone for the Buy button, synthesised rather than loaded.
 *
 * A file would be the obvious way and it is the wrong one here: the whole page
 * is one screen with no backend, and the shortest usable mp3 still costs a
 * request, a decode and a format matrix to get right in every browser. The
 * graph below costs none of that, and the sound is written where it can be read
 * and tuned like anything else in the project.
 *
 * It is built as a struck object rather than as a tone, because that is the
 * whole difference between a chime and a beep:
 *
 *   - Several partials at once, not one. A sine has nothing above its
 *     fundamental, which is why a bare one always sounds like test equipment.
 *   - The partials decay at *different* rates, the high ones fastest. That is
 *     what real struck things do, and the ear reads the pattern as a physical
 *     object long before it identifies the pitch.
 *   - One of them is deliberately inharmonic (5.4x, not 5x). Whole-number
 *     ratios sound like an organ; the slightly-off one is what makes it metal.
 *   - A short noise transient at the top, so there is a strike and not just an
 *     onset.
 *   - Reverb. Nothing gives away a synthesised sound faster than being
 *     perfectly dry -- a real object is always in a room.
 */

// One context for the page, created on the first press and never before.
// Browsers will not start an AudioContext outside a user gesture -- built at
// import time it is handed back already suspended, and the first press then
// makes no sound at all while everything looks like it worked.
let ctx = null
let bus = null

const context = () => {
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  // A context can also be suspended out from under us -- a background tab, or
  // Safari deciding the page went quiet. Resuming is a no-op when it is already
  // running, so this costs nothing on the common path.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

/**
 * A room, as noise that fades out. Convolving against this is what puts the
 * chime somewhere instead of nowhere.
 *
 * The two channels get independently random noise, which is the cheapest honest
 * stereo there is: the ear hears the decorrelation between the ears as width,
 * and copying one channel to the other would collapse it back to a point.
 */
const impulse = (ac, seconds = 1.4, decay = 3.4) => {
  const length = Math.max(1, Math.floor(ac.sampleRate * seconds))
  const buffer = ac.createBuffer(2, length, ac.sampleRate)
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
    }
  }
  return buffer
}

/**
 * Built once and kept: the impulse response is ~130k samples to generate, and
 * paying for that on every press would put the cost on the very click the sound
 * is meant to make feel immediate.
 */
const graph = (ac) => {
  if (bus) return bus

  const dry = ac.createGain()
  const wet = ac.createGain()
  wet.gain.value = 0.3

  const room = ac.createConvolver()
  room.buffer = impulse(ac)

  const master = ac.createGain()
  master.gain.value = 0.7

  // A limiter, not for loudness but for safety: several partials and two
  // overlapping notes can line up their peaks, and the result of asking for
  // more than full scale is not a loud sound but a distorted one.
  const ceiling = ac.createDynamicsCompressor()
  ceiling.threshold.value = -8
  ceiling.knee.value = 6
  ceiling.ratio.value = 12
  ceiling.attack.value = 0.003
  ceiling.release.value = 0.15

  dry.connect(master)
  wet.connect(room).connect(master)
  master.connect(ceiling).connect(ac.destination)

  bus = { dry, wet }
  return bus
}

// ratio 1 is the pitch you hear; the rest are the timbre. `decay` is a fraction
// of the note's length, so the high partials are gone while the fundamental is
// still ringing -- struck, rather than switched on.
const PARTIALS = [
  { ratio: 1, gain: 1, decay: 1 },
  { ratio: 2.01, gain: 0.34, decay: 0.55 },
  { ratio: 3.02, gain: 0.13, decay: 0.3 },
  { ratio: 5.4, gain: 0.05, decay: 0.18 },
]

/**
 * `at` is on the context's own clock, not the page's: scheduling against
 * `currentTime` puts the timing in the audio thread's hands, so the interval
 * between the two notes holds even if the main thread is busy animating a
 * jacket across the screen -- which, on this button, it usually is.
 */
const strike = (ac, out, freq, at, length, peak) => {
  const voice = ac.createGain()
  voice.gain.value = peak

  // The strike is bright and then is not, because the energy in the high
  // partials leaves first. Sweeping the filter down does in one node what
  // otherwise needs a separate envelope on every partial.
  const tone = ac.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.setValueAtTime(7000, at)
  tone.frequency.exponentialRampToValueAtTime(1600, at + length)

  voice.connect(tone)
  tone.connect(out.dry)
  tone.connect(out.wet)

  PARTIALS.forEach(({ ratio, gain, decay }) => {
    const osc = ac.createOscillator()
    const amp = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq * ratio

    // Ramped, never assigned, and never through zero. Stepping a gain from
    // silence to full between one sample and the next is a discontinuity, and
    // that click is louder and cheaper-sounding than the note it introduces.
    // The floor is 0.0001 rather than 0 because an exponential ramp to zero is
    // undefined -- browsers either ignore it or drop the note entirely.
    const span = length * decay
    amp.gain.setValueAtTime(0.0001, at)
    amp.gain.exponentialRampToValueAtTime(gain, at + 0.006)
    amp.gain.exponentialRampToValueAtTime(0.0001, at + span)

    osc.connect(amp).connect(voice)
    osc.start(at)
    // Stopped, so the node is finished with and collected rather than left
    // running silently for the life of the page.
    osc.stop(at + span + 0.02)
  })
}

/** The mallet: a few milliseconds of filtered noise, felt more than heard. */
const transient = (ac, out, at) => {
  const length = 0.05
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * length), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 6
  }

  const noise = ac.createBufferSource()
  noise.buffer = buffer

  // High-passed, so it reads as the contact and not as a hiss under the note.
  const edge = ac.createBiquadFilter()
  edge.type = 'highpass'
  edge.frequency.value = 2200

  const amp = ac.createGain()
  amp.gain.value = 0.16

  noise.connect(edge).connect(amp)
  amp.connect(out.dry)
  amp.connect(out.wet)
  noise.start(at)
}

/** A little weight underneath, so the chime lands rather than only appears. */
const body = (ac, out, at) => {
  const osc = ac.createOscillator()
  osc.type = 'sine'
  // Dropping in pitch as it decays: the same trick every kick drum uses, and
  // the ear takes the fall as impact rather than as a note of its own.
  osc.frequency.setValueAtTime(240, at)
  osc.frequency.exponentialRampToValueAtTime(110, at + 0.13)

  const amp = ac.createGain()
  amp.gain.setValueAtTime(0.0001, at)
  amp.gain.exponentialRampToValueAtTime(0.1, at + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.18)

  osc.connect(amp).connect(out.dry)
  osc.start(at)
  osc.stop(at + 0.22)
}

/**
 * Two strikes a fifth apart, the second landing while the first is still
 * ringing: a rise, which reads as *done* rather than as a notification. The
 * fifth is the interval with the least character of its own -- a third would
 * sound cheerful and a fourth unfinished, and this button should sound
 * expensive rather than pleased with itself.
 */
export function playAdded() {
  const ac = context()
  if (!ac) return
  const out = graph(ac)

  // A hair in the future. Scheduling exactly at `currentTime` asks for a start
  // in the block the audio thread is already rendering, which some browsers
  // round up and others clip the front off.
  const t = ac.currentTime + 0.01

  transient(ac, out, t)
  body(ac, out, t)
  strike(ac, out, 659.25, t, 0.6, 0.26) // E5
  strike(ac, out, 987.77, t + 0.08, 0.85, 0.22) // B5
}

import styles from './ThermalScale.module.css'

/**
 * The claim this screen is built around — comfortable down to minus fifteen —
 * drawn as the range it actually is, rather than stated once as a number.
 *
 * A photograph of the garment sat here before. It showed the reader nothing the
 * first screen had not already shown them better, and it said nothing at all
 * about performance, which is what this screen is for. A drawing of the same
 * garment would have had the same problem: the subject of this page is not what
 * the coat looks like.
 *
 * So the graphic is the specification. One measure against one scale, which is
 * a meter rather than a chart — no second series, so no legend, and the axis
 * carries only the decades. The fill reads as warmth: one hue at falling
 * intensity, never a spectrum, because a rainbow ramp invents boundaries the
 * measurement does not have. The hue is the colourway's own, so this screen
 * still answers which jacket you are looking at now there is no picture of it.
 *
 * What it says out loud is the *span*, not the endpoint. The heading beside it
 * already reads TESTED AT MINUS FIFTEEN and there is a −15 in the figures
 * below, so a third one set large here would read as a stutter rather than as
 * an answer. The bracket names the thirty-five degrees the jacket covers, which
 * nothing else on the screen says.
 */

// Degrees celsius, top to bottom. The domain runs past the claim at both ends
// on purpose: a bar that filled its whole track would say the jacket had been
// tested to the limit of the paper rather than to minus fifteen.
const TOP = 20
const BOTTOM = -30
const LIMIT = -15

// Where a temperature sits down the track, as a percentage.
const at = (t) => ((TOP - t) / (TOP - BOTTOM)) * 100

const DECADES = [20, 10, 0, -10, -20, -30]

export default function ThermalScale({ shown }) {
  return (
    <div
      className={shown ? `${styles.scale} ${styles.shown}` : styles.scale}
      style={{ '--limit': `${at(LIMIT)}%` }}
      role="img"
      aria-label={`Comfortable from ${TOP} degrees celsius down to ${LIMIT} degrees celsius, a range of ${TOP - LIMIT} degrees`}
    >
      {/* The reading, named as a span. Spans the filled part of the track and
          nothing else, so its own length is the measurement. */}
      <div className={styles.bracket} aria-hidden="true">
        <span className={styles.bracketLabel}>{TOP - LIMIT}° of comfort</span>
      </div>

      <div className={styles.track}>
        {/* The measure. Square where it meets the top of the track because it
            is anchored there, rounded at the bottom because that end is the
            reading — the shape says which end is data and which is scale. */}
        <div className={styles.fill} />
      </div>

      <div className={styles.axis}>
        {/* Recessive by design: this is the ruler, not the reading. Each tick
            touches the track, so the numbers belong to the bar beside them
            rather than floating free of it. */}
        {DECADES.map((degree) => (
          <div key={degree} className={styles.tick} style={{ '--at': `${at(degree)}%` }}>
            <span className={styles.degree}>{degree > 0 ? `+${degree}` : degree}</span>
          </div>
        ))}
      </div>

      {/* The one line worth drawing across the whole figure: where the fill
          stops. It is the only rule here at full strength, and it belongs to
          the figure rather than to the ruler -- nested inside the ruler, as it
          was, it is positioned against that column instead of the whole scale
          and runs off the right of the plate. */}
      <div className={styles.limit}>
        <span className={styles.limitLabel}>
          Comfort limit
          <i className={styles.limitValue}>−15 °C</i>
        </span>
      </div>
    </div>
  )
}

import { motion } from 'framer-motion'
import styles from './PerformanceView.module.css'

// Each bar is a share of what the category's best performer manages, not an
// absolute: "warmth 88" means nothing on its own, and a bar has to be a
// fraction of something or it is decoration.
const METRICS = [
  { label: 'Warmth', value: 88, note: '800 fill power' },
  { label: 'Wind resistance', value: 94, note: '20D tight weave' },
  { label: 'Water repellency', value: 62, note: 'DWR finish, not a shell' },
  { label: 'Packability', value: 76, note: 'Down to 1.4 litres' },
  { label: 'Weight', value: 41, note: '640 g — light, not the lightest' },
]

const MATERIALS = [
  ['Shell', '20D ripstop nylon'],
  ['Fill', '800FP responsible down'],
  ['Lining', 'Recycled taffeta'],
  ['Hood', 'Fixed, two-way adjustable'],
  ['Care', 'Machine wash cold, tumble low'],
]

// Where the jacket is comfortable, on a scale that runs from -30 to +15.
const SCALE_MIN = -30
const SCALE_MAX = 15
const COMFORT = [-15, 5]
const position = (t) => ((t - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100

export default function PerformanceView() {
  return (
    <section className={styles.view}>
      <div className={styles.intro}>
        <p className={styles.kicker}>
          <i className={styles.dot} />
          Performance
        </p>

        <h1 className={styles.heading}>
          Tested at
          <br />
          <span className={styles.outline}>minus fifteen</span>
        </h1>

        {/* The band shows where the jacket is comfortable against the range it
            was tested across, which a pair of numbers alone cannot. */}
        <div className={styles.scale}>
          <div className={styles.track}>
            <motion.div
              className={styles.comfort}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              style={{
                left: `${position(COMFORT[0])}%`,
                width: `${position(COMFORT[1]) - position(COMFORT[0])}%`,
              }}
            />
          </div>
          <div className={styles.scaleLabels}>
            <span>{SCALE_MIN}°</span>
            <span className={styles.comfortLabel}>
              Comfort {COMFORT[0]}° to {COMFORT[1]}°
            </span>
            <span>+{SCALE_MAX}°</span>
          </div>
        </div>
      </div>

      <div className={styles.detail}>
        <ul className={styles.metrics}>
          {METRICS.map((metric, i) => (
            <li key={metric.label} className={styles.metric}>
              <span className={styles.metricHead}>
                <span className={styles.metricLabel}>{metric.label}</span>
                <span className={styles.metricValue}>{metric.value}</span>
              </span>
              <span className={styles.bar}>
                <motion.i
                  className={styles.fill}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: metric.value / 100 }}
                  transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1],
                    // Staggered, so the column reads as a list being filled in
                    // rather than five things arriving at once.
                    delay: 0.1 + i * 0.07,
                  }}
                />
              </span>
              <span className={styles.metricNote}>{metric.note}</span>
            </li>
          ))}
        </ul>

        <dl className={styles.materials}>
          {MATERIALS.map(([term, value]) => (
            <div key={term} className={styles.material}>
              <dt className={styles.materialLabel}>{term}</dt>
              <dd className={styles.materialValue}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

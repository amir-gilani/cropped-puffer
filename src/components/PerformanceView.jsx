import { useEffect, useRef, useState } from 'react'
import styles from './PerformanceView.module.css'

const SPECS = [
  ['Shell', '20D ripstop nylon, DWR'],
  ['Fill', '800FP responsible down'],
  ['Hood', 'Fixed, two-way adjustable'],
  ['Cuff', 'Elasticated, storm-tight'],
  ['Hem', 'Drawcord, dropped back'],
]

// The three figures worth reading from across the room.
const STATS = [
  { value: '800', unit: 'fill power' },
  { value: '640', unit: 'grams' },
  { value: '−15°', unit: 'comfort floor' },
]

/**
 * Deliberately not the composition of the first screen. There the jacket stands
 * in the middle with everything arranged around it; here it is pushed to one
 * side and measured, and the page reads left to right -- the drawing first,
 * then the specification it belongs to. Same product, presented as a plate
 * rather than as a hero.
 */
export default function PerformanceView({ theme }) {
  // One observer and a class, rather than an animation library instance per
  // element. These are one-shot reveals of transform and opacity, which CSS
  // hands to the compositor -- seven JS animations were writing styles every
  // frame of the scroll that brings the section into view, which is exactly
  // when there is least time to spare.
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node || shown) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShown(true)
        observer.disconnect()
      },
      { threshold: 0.4 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [shown])

  return (
    <section className={shown ? `${styles.view} ${styles.shown}` : styles.view} ref={ref}>
      <figure className={styles.plate}>
        <img className={styles.jacket} src={theme.jacket} alt={`${theme.name} puffer jacket`} />

        {/* Dimension lines, the way a spec sheet carries a measurement: ticked
            at both ends and labelled on the line itself. They also give the
            drawing an edge to sit against, which a floating cut-out lacks. */}
        <div className={styles.spanHeight}>
          <span className={styles.spanLabelVertical}>54 cm</span>
        </div>
        <div className={styles.spanWidth}>
          <span className={styles.spanLabel}>58 cm</span>
        </div>
      </figure>

      <div className={styles.sheet}>
        <p className={styles.kicker}>
          <i className={styles.dot} />
          Performance
        </p>

        <h1 className={styles.heading}>
          Tested at
          <br />
          <span className={styles.outline}>minus fifteen</span>
        </h1>

        <dl className={styles.specs}>
          {SPECS.map(([term, value], i) => (
            <div
              key={term}
              className={styles.spec}
              // Staggered, so the sheet reads as being filled in line by line
              // rather than five rows arriving at once.
              style={{ '--row': i }}
            >
              <dt className={styles.specTerm}>{term}</dt>
              <dd className={styles.specValue}>{value}</dd>
            </div>
          ))}
        </dl>

        <dl className={styles.stats}>
          {STATS.map((stat) => (
            <div key={stat.unit} className={styles.stat}>
              <dt className={styles.statValue}>{stat.value}</dt>
              <dd className={styles.statUnit}>{stat.unit}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

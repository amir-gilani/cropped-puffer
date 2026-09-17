import { useEffect, useRef, useState } from 'react'
import ThermalScale from './ThermalScale.jsx'
import styles from './PerformanceView.module.css'

/**
 * Six facts, each set as a figure rather than a table row: a small label, the
 * value at display size, and the qualifier underneath in reading size.
 *
 * The section used to carry a list of hairline rows with the values pushed to
 * the far right, and a strip of three big numbers below it. That put the
 * interesting part -- the numbers -- in the smallest type on the page, left a
 * long empty channel down the middle of every row, and said several things
 * twice. Here the specification *is* the typography.
 *
 * The left of the screen used to hold a photograph of the jacket, registered
 * with crop marks and measured with dimension lines. It went because it was the
 * weakest thing on the page: the first screen shows the garment better, and
 * this screen is about how the garment performs, which no picture of it can
 * say. What stands there now is the headline claim drawn as the range it
 * actually is -- see ThermalScale. The plate's furniture stayed, because crop
 * marks and a figure number belong to the page rather than to the photograph.
 */
const FIGURES = [
  { label: 'Fill', value: '800', unit: 'FP', note: 'Responsible down' },
  { label: 'Weight', value: '640', unit: 'g', note: 'In a size 38' },
  { label: 'Comfort', value: '−15', unit: '°C', note: 'Tested, not modelled' },
  { label: 'Shell', value: '20', unit: 'D', note: 'Ripstop nylon, DWR' },
  { label: 'Packed', value: '1.4', unit: 'L', note: 'Down to a water bottle' },
  { label: 'Repair', value: '5', unit: 'yr', note: 'Free, whatever happened' },
]

export default function PerformanceView() {
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
      // Just enough of it on screen to know the reader is on the way.
      { threshold: 0.12 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [shown])

  return (
    <section className={shown ? `${styles.view} ${styles.shown}` : styles.view} ref={ref}>
      <figure className={styles.plate}>
        {/* The graphic and its registration, measured by nothing: the crop
            marks sit on this box, which *is* the artwork's box. A photograph
            drew smaller than the element holding it, so all of this used to
            have to be measured in JS and handed back to CSS as four custom
            properties before a single mark could be placed. */}
        <div className={styles.field}>
          <ThermalScale shown={shown} />

          {/* Crop marks at the corners, the way a plate is registered for
              print: two sides of a corner each, held off the artwork so they
              mark it without touching it. */}
          <span className={`${styles.crop} ${styles.cropTL}`} />
          <span className={`${styles.crop} ${styles.cropTR}`} />
          <span className={`${styles.crop} ${styles.cropBL}`} />
          <span className={`${styles.crop} ${styles.cropBR}`} />
        </div>

        <figcaption className={styles.caption}>Fig. 01 — comfort range, size 38</figcaption>
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

        <div className={styles.figures}>
          {FIGURES.map((figure, i) => (
            <div key={figure.label} className={styles.figure} style={{ '--cell': i }}>
              <span className={styles.figureLabel}>{figure.label}</span>
              <span className={styles.figureValue}>
                {figure.value}
                <i className={styles.figureUnit}>{figure.unit}</i>
              </span>
              <span className={styles.figureNote}>{figure.note}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

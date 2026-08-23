import { useCallback, useEffect, useRef, useState } from 'react'
import { JACKET_RATIO } from '../animation.js'
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
 */
const FIGURES = [
  { label: 'Fill', value: '800', unit: 'FP', note: 'Responsible down' },
  { label: 'Weight', value: '640', unit: 'g', note: 'In a size 38' },
  { label: 'Comfort', value: '−15', unit: '°C', note: 'Tested, not modelled' },
  { label: 'Shell', value: '20', unit: 'D', note: 'Ripstop nylon, DWR' },
  { label: 'Packed', value: '1.4', unit: 'L', note: 'Down to a water bottle' },
  { label: 'Repair', value: '5', unit: 'yr', note: 'Free, whatever happened' },
]

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
      // Just enough of it on screen to know the reader is on the way.
      { threshold: 0.12 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [shown])

  /**
   * Where the artwork is actually drawn inside the plate. The image is
   * `object-fit: contain`, so its box and its picture are two different
   * rectangles -- and everything else on this plate is a measurement *of the
   * garment*, so all of it hangs off the picture. Pinned to the box instead,
   * the dimension lines ran along the edges of the screen and read as page
   * furniture rather than as a spec.
   *
   * Handed to CSS as four custom properties, so the marks are laid out by the
   * stylesheet and only their origin comes from JS.
   */
  const plateRef = useRef(null)
  const imageRef = useRef(null)
  const [drawn, setDrawn] = useState(null)

  const measure = useCallback(() => {
    const plate = plateRef.current
    const image = imageRef.current
    if (!plate || !image) return
    const box = image.getBoundingClientRect()
    const frame = plate.getBoundingClientRect()
    if (!box.width || !box.height) return

    const ratio =
      image.naturalWidth && image.naturalHeight
        ? image.naturalWidth / image.naturalHeight
        : JACKET_RATIO
    // The fitted picture: as large as it can be inside the box at its own
    // ratio, and centred there, which is what leaves the two side margins.
    const fitted =
      box.width / box.height > ratio
        ? { width: box.height * ratio, height: box.height }
        : { width: box.width, height: box.width / ratio }

    setDrawn({
      x: Math.round(box.left - frame.left + (box.width - fitted.width) / 2),
      y: Math.round(box.top - frame.top + (box.height - fitted.height) / 2),
      width: Math.round(fitted.width),
      height: Math.round(fitted.height),
    })
  }, [])

  useEffect(() => {
    const plate = plateRef.current
    if (!plate) return undefined
    measure()
    // The plate is sized in vw and vh, so every resize moves the picture inside
    // it -- and the first measurement can land before the image has decoded,
    // when its natural size is not known yet.
    const observer = new ResizeObserver(measure)
    observer.observe(plate)
    const image = imageRef.current
    image?.addEventListener('load', measure)
    return () => {
      observer.disconnect()
      image?.removeEventListener('load', measure)
    }
  }, [measure])

  return (
    <section className={shown ? `${styles.view} ${styles.shown}` : styles.view} ref={ref}>
      <figure
        className={styles.plate}
        ref={plateRef}
        style={
          drawn
            ? {
                '--dx': `${drawn.x}px`,
                '--dy': `${drawn.y}px`,
                '--dw': `${drawn.width}px`,
                '--dh': `${drawn.height}px`,
              }
            : undefined
        }
      >
        <img
          className={styles.jacket}
          ref={imageRef}
          src={theme.jacket}
          alt={`${theme.name} puffer jacket`}
        />

        {/* Everything below is held back until the picture has been measured:
            before that there is no rectangle to hang it on, and marks drawn at
            the plate's edges would jump to the garment on the next frame. */}
        {drawn ? (
          <>
            {/* Crop marks at the corners of the artwork, the way a plate is
                registered for print. They say where the garment ends, which a
                cut-out on a plain ground otherwise never does. */}
            <span className={`${styles.crop} ${styles.cropTL}`} />
            <span className={`${styles.crop} ${styles.cropTR}`} />
            <span className={`${styles.crop} ${styles.cropBL}`} />
            <span className={`${styles.crop} ${styles.cropBR}`} />

            {/* Dimension lines, the way a spec sheet carries a measurement:
                ticked at both ends and labelled on the line itself. */}
            <div className={styles.spanHeight}>
              <span className={styles.spanLabelVertical}>54 cm</span>
            </div>
            <div className={styles.spanWidth}>
              <span className={styles.spanLabel}>58 cm</span>
            </div>

            <figcaption className={styles.caption}>Fig. 01 — size 38, laid flat</figcaption>
          </>
        ) : null}
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

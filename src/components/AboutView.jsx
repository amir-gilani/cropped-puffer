import { useEffect, useRef, useState } from 'react'
import styles from './AboutView.module.css'

/**
 * Cut, worn, mended: the jacket's life in order, rather than three claims
 * about the company. The terms used to be Made, Tested and Backed, which are
 * what a brand says about itself -- these are things that are done to a coat,
 * and each one is answered with a fact rather than a promise.
 */
const PILLARS = [
  ['Cut', 'In Amsterdam, from one pattern, by nine people we can name.'],
  ['Worn', 'A winter on the people who made it, before any is sold.'],
  ['Mended', 'Free for five years. We keep the shell and thread for it.'],
]

const CONTACT = [
  ['Write', 'hello@croppedpuffer.com'],
  ['Visit', 'Prinsengracht 263, Amsterdam · Thu–Sat'],
  ['Follow', 'Instagram · Are.na'],
]

// Set once around the ring and stretched to the exact circumference, so the
// spacing is even and the sentence closes on itself rather than running out.
const SEAL_TEXT = 'CROPPED PUFFER · AMSTERDAM · EST. 2013 · ONE JACKET, DONE PROPERLY · '
// r = 90 in the viewBox below; the path the letters ride.
const SEAL_CIRCUMFERENCE = 2 * Math.PI * 90

/**
 * The closing screen, and the only one without the product on it: by the time a
 * reader is here they have seen the jacket sold and then measured, and a third
 * appearance would say nothing new.
 *
 * Centred, where the other two are not. The first screen is arranged around the
 * garment and the second reads left to right along a drawing; this one has no
 * object to organise itself around, so it is symmetrical about the middle and
 * settles the page rather than driving it forward.
 *
 * Having no object, though, it needs a centre. The maker's seal is it: the same
 * concentric hairline rings the product stands on, back once more with the
 * jacket gone from between them, turning slowly behind the type.
 */
export default function AboutView() {
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
      {/* Behind everything and inert: a watermark, not an ornament sitting on
          the page. Drawn in the text colour at low strength so it rides the
          theme with the rest of the screen. */}
      <svg className={styles.seal} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <defs>
          <path id="sealPath" d="M100,10 a90,90 0 1,1 -0.01,0" />
        </defs>
        <circle className={styles.ringOuter} cx="100" cy="100" r="97" />
        <circle className={styles.ringInner} cx="100" cy="100" r="82" />
        <g className={styles.sealSpin}>
          <text className={styles.sealText}>
            <textPath
              href="#sealPath"
              startOffset="0"
              textLength={SEAL_CIRCUMFERENCE}
              lengthAdjust="spacing"
            >
              {SEAL_TEXT}
            </textPath>
          </text>
        </g>
        {/* Four ticks on the cardinal points, the way a dial is marked. They
            hold the ring still while the lettering turns inside it. */}
        <g className={styles.ticks}>
          <line x1="100" y1="3" x2="100" y2="17" />
          <line x1="197" y1="100" x2="183" y2="100" />
          <line x1="100" y1="197" x2="100" y2="183" />
          <line x1="3" y1="100" x2="17" y2="100" />
        </g>
      </svg>

      {/* A plumb line down into the kicker: the axis the whole screen is
          symmetrical about, drawn rather than implied. */}
      <i className={styles.plumb} aria-hidden="true" />

      <p className={styles.kicker}>
        <i className={styles.dot} />
        About us
      </p>

      {/* Each line masked and lifted from under its own edge, so the words
          arrive as type being set rather than a block fading up. */}
      <h1 className={styles.heading}>
        <span className={styles.line} style={{ '--cell': 0 }}>
          <span className={styles.lineInner}>One jacket,</span>
        </span>
        <span className={styles.line} style={{ '--cell': 1 }}>
          <span className={`${styles.lineInner} ${styles.outline}`}>done properly</span>
        </span>
      </h1>

      {/* The line under the heading should carry a fact, not paraphrase it.
          The old one said "we make one thing and keep making it better", which
          is the headline again in smaller type; this one dates the claim and
          ends on the thing nobody else in the trade does. */}
      <p className={styles.lead}>
        One jacket since 2013, never out of production and never renamed: the same
        pattern, redrawn a little each winter.
      </p>

      {/* Divided by rules between them rather than above them: a centred block
          wants to be held together, and a line over each column cuts it into
          three separate things. The rules are drawn, not bordered, so each one
          can grow out of the middle as its column arrives. */}
      <div className={styles.pillars}>
        {PILLARS.map(([term, body], i) => (
          <article key={term} className={styles.pillar} style={{ '--cell': i }}>
            <h2 className={styles.pillarTerm}>{term}</h2>
            <p className={styles.pillarBody}>{body}</p>
          </article>
        ))}
      </div>

      {/* The end of the page, so it carries what an end should: where to find
          us. This is the footer the first screen deliberately does without. */}
      <dl className={styles.contact}>
        {CONTACT.map(([term, value], i) => (
          <div key={term} className={styles.contactItem} style={{ '--cell': i }}>
            <dt className={styles.contactTerm}>{term}</dt>
            <dd className={styles.contactValue}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

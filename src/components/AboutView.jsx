import { useEffect, useRef, useState } from 'react'
import styles from './AboutView.module.css'

const COLUMNS = [
  {
    term: 'Made',
    body: 'One jacket, revised each season rather than replaced. Cut in a factory we have used for eleven years, by people we can name.',
  },
  {
    term: 'Tested',
    body: 'Worn through a winter before it is sold — on ferries, building sites and school runs, not on a mannequin in a cold room.',
  },
  {
    term: 'Backed',
    body: 'Repaired free for five years, whatever went wrong and whoever caused it. Send it back and it comes home mended.',
  },
]

const CONTACT = [
  ['Write', 'hello@croppedpuffer.com'],
  ['Visit', 'Prinsengracht 263, Amsterdam'],
  ['Follow', 'Instagram · Are.na'],
]

/**
 * The third composition, and the only one without the product in it. The first
 * screen sells the jacket and the second measures it; by the time a reader has
 * scrolled this far they have seen it twice, and putting it here a third time
 * would say nothing new. So this section is set in type alone, and closes the
 * page with the contact details the footer used to carry.
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
      <header className={styles.head}>
        <p className={styles.kicker}>
          <i className={styles.dot} />
          About us
        </p>

        <h1 className={styles.heading}>
          One jacket,
          <br />
          <span className={styles.outline}>done properly</span>
        </h1>
      </header>

      <div className={styles.columns}>
        {COLUMNS.map((column, i) => (
          <article key={column.term} className={styles.column} style={{ '--row': i }}>
            <h2 className={styles.columnHead}>
              <span className={styles.columnIndex}>{String(i + 1).padStart(2, '0')}</span>
              {column.term}
            </h2>
            <p className={styles.columnBody}>{column.body}</p>
          </article>
        ))}
      </div>

      {/* The end of the page, so it carries what an end should: where to find
          us. This is the footer the first screen deliberately does without. */}
      <dl className={styles.contact}>
        {CONTACT.map(([term, value]) => (
          <div key={term} className={styles.contactItem}>
            <dt className={styles.contactTerm}>{term}</dt>
            <dd className={styles.contactValue}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

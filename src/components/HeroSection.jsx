import styles from './HeroSection.module.css'

/**
 * Two words instead of a sentence, set as a display lockup: the first solid,
 * the second cut out to an outline. A paragraph beside a product photograph
 * always loses to it, so the left column stops trying to be read and becomes
 * something to look at instead.
 */
export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <p className={styles.eyebrow}>
        <i className={styles.dot} />
        In stock — FW 25
      </p>

      <h1 className={styles.heading}>
        Below
        <br />
        <span className={styles.outline}>Zero</span>
      </h1>

      <p className={styles.line}>Cropped. Hooded. 800-fill down.</p>
    </section>
  )
}

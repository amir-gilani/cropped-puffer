import styles from './Stepper.module.css'

const pad = (n) => String(n).padStart(2, '0')

/**
 * The colourway control, moved out of the left column to the foot of the
 * screen, where it mirrors the corner preview: the thing you press on one side,
 * the thing it brings in on the other.
 */
export default function Stepper({ onPrev, onNext, canPrev, canNext, index, total }) {
  return (
    <div className={styles.stepper}>
      <button
        className={styles.step}
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Previous colour"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M14 6l-6 6 6 6" />
        </svg>
      </button>

      <span className={styles.counter}>
        {pad(index + 1)}
        <i className={styles.slash}>/</i>
        {pad(total)}
      </span>

      <button
        className={styles.step}
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next colour"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M10 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  )
}

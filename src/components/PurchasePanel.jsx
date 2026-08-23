import { AnimatePresence, motion } from 'framer-motion'
import styles from './PurchasePanel.module.css'

const SIZES = [36, 38, 40]

/**
 * A value that changes with the colourway. Keyed on its own content, so it
 * lifts out and the next one drops in -- a price that simply swapped
 * characters underneath a still card would read as a glitch rather than a
 * change of product.
 */
function Swap({ children, className }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={String(children)}
        className={className}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  )
}

/**
 * Every hard fact about the garment, gathered into one card: what it costs,
 * what size, what colour, what it is made of. Previously these were scattered
 * down the right edge and across the left column; as one panel they read as a
 * spec sheet pinned beside the product.
 */
export default function PurchasePanel({ theme, size, onSize }) {

  return (
    <aside className={styles.card}>
      <div className={styles.row}>
        <span className={styles.label}>Price</span>
        <span className={styles.prices}>
          <Swap className={styles.price}>${theme.price}</Swap>
          <Swap className={styles.oldPrice}>${theme.was}</Swap>
        </span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Size</span>
        <span className={styles.sizes}>
          {SIZES.map((value) => (
            <button
              key={value}
              type="button"
              className={value === size ? styles.sizeActive : styles.size}
              onClick={() => onSize(value)}
              aria-pressed={value === size}
            >
              {value}
            </button>
          ))}
        </span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Colour</span>
        <Swap className={styles.value}>{theme.name}</Swap>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Fill</span>
        <span className={styles.value}>800 · 640 g</span>
      </div>
    </aside>
  )
}

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './CartPanel.module.css'

const money = (n) => `$${n}`

/**
 * The cart, as a drawer down the right edge of the screen. Lines are keyed by
 * colourway and size together, because the same jacket in two sizes is two
 * products.
 */
export default function CartPanel({ open, lines, onClose, onRemove }) {
  // A panel that covers content has to be dismissible from the keyboard, not
  // only by finding the button again.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0)
  const count = lines.reduce((sum, line) => sum + line.qty, 0)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Dims the page and catches the next click anywhere else, so the
              drawer closes the way every other one does. */}
          <motion.div
            className={styles.catcher}
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          <motion.aside
            className={styles.panel}
            // Slides in from the edge it lives on, so it reads as something
            // pulled out of the side rather than a box appearing.
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Cart"
          >
            <header className={styles.head}>
              <span className={styles.title}>Cart</span>
              <span className={styles.headRight}>
                <span className={styles.count}>
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
                <button className={styles.close} type="button" onClick={onClose} aria-label="Close cart">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </span>
            </header>

            {lines.length === 0 ? (
              <p className={styles.empty}>Nothing in here yet.</p>
            ) : (
              <ul className={styles.lines} data-scrollable>
                <AnimatePresence initial={false}>
                  {lines.map((line) => (
                    <motion.li
                      key={line.id}
                      className={styles.line}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <img className={styles.thumb} src={line.jacket} alt="" />
                      <span className={styles.lineText}>
                        <span className={styles.lineName}>{line.name}</span>
                        <span className={styles.lineMeta}>
                          Size {line.size} · {line.qty} ×
                        </span>
                      </span>
                      <span className={styles.linePrice}>{money(line.price * line.qty)}</span>
                      <button
                        className={styles.remove}
                        type="button"
                        onClick={() => onRemove(line.id)}
                        aria-label={`Remove ${line.name}`}
                      >
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}

            <footer className={styles.foot}>
              <span className={styles.totalLabel}>Total</span>
              <span className={styles.total}>{money(total)}</span>
            </footer>

            <button className={styles.checkout} type="button" disabled={lines.length === 0}>
              Checkout
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

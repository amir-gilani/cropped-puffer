import { forwardRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './Header.module.css'

const NAV_ITEMS = ['OVERVIEW', 'PERFORMANCE', 'ABOUT US']

/** `activeNavRef` marks the docking slot the outgoing jacket flies into. */
const Header = forwardRef(function Header({ cartCount, cartOpen, onCartClick }, activeNavRef) {
  const [active, setActive] = useState(0)

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.wordmark}>Cropped Puffer</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item, i) => (
          <button
            key={item}
            // The jacket always docks into the first item, highlighted or not:
            // that slot is the fixed end of its travel path.
            ref={i === 0 ? activeNavRef : undefined}
            className={styles.navItem}
            type="button"
            aria-current={i === active ? 'page' : undefined}
            onClick={() => setActive(i)}
          >
            {i === active && (
              // One element shared across the items, so it slides between them
              // rather than disappearing here and reappearing there.
              <motion.span
                layoutId="navPill"
                className={styles.navPill}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <span className={styles.navLabel}>{item}</span>
          </button>
        ))}
      </nav>

      <div className={styles.actions}>
        <button
          className={cartOpen ? `${styles.iconButton} ${styles.iconButtonOn}` : styles.iconButton}
          type="button"
          onClick={onCartClick}
          aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          aria-expanded={cartOpen}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 7h12l-1.2 12H7.2L6 7Z" />
            <path d="M9 7a3 3 0 0 1 6 0" />
          </svg>
          <AnimatePresence>
            {cartCount > 0 && (
              // Keyed on the count, so every addition re-runs the pop rather
              // than silently changing the number.
              <motion.span
                key={cartCount}
                className={styles.badge}
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.2, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 620, damping: 24 }}
              >
                {cartCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <button className={styles.iconButton} type="button" aria-label="Wishlist">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 19s-7-4.4-7-9a3.8 3.8 0 0 1 7-2.1A3.8 3.8 0 0 1 19 10c0 4.6-7 9-7 9Z" />
          </svg>
        </button>
      </div>
    </header>
  )
})

export default Header

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TIMING } from '../animation.js'
import { playAdded } from '../sound.js'
import styles from './ProductStand.module.css'

/**
 * Both variants read the geometry measured at click time, so the two jackets
 * always share one continuous diagonal:
 *
 *   corner thumbnail  <->  centre stage  <->  off the top of the screen
 *
 * Forward, the outgoing jacket shrinks away up the diagonal and out of the
 * frame while the next one grows out of the corner thumbnail. Back, it runs
 * exactly in reverse: the arriving jacket comes in over the top edge.
 *
 * Both legs of that trip are the same line read in opposite directions --
 * `above` is one number, measured once per click, and the departing jacket
 * aims at it while the arriving one starts from it. So re-aiming the diagonal
 * re-aims both ends together; there is nothing to keep in step by hand.
 *
 * It used to dock onto the nav item and dissolve there instead, which had one
 * jacket disappearing on the spot and the other appearing on it.
 */
const dock = ({ thumb, above }, direction) => (direction > 0 ? above : thumb)
const source = ({ thumb, above }, direction) => (direction > 0 ? thumb : above)

// Opacity never appears below, in either direction, and that is the point: a
// jacket is solid for every frame it is on screen. `.screen` is
// `overflow: hidden`, so the edge of the screen is what ends one leaving and
// what uncovers one arriving. Fading as well meant keeping a hardcoded window
// in step with where the diagonal actually crosses that edge -- which moves
// whenever NAV_ANCHOR is re-aimed, so the window went stale and the arriving
// jacket came up in mid-air instead of at the edge. The clip is exact at any
// anchor, and mirrors the two legs for free.
const jacketVariants = {
  enter: (swap) => source(swap, swap.direction),
  center: {
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      delay: TIMING.enterDelay,
      duration: TIMING.enterDuration,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: (swap) => ({
    ...dock(swap, swap.direction),
    transition: {
      duration: TIMING.exitDuration,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
}

export default function ProductStand({ theme, themeIndex, swap, stageRef, onBuy, onExitComplete }) {
  // A press that changes something off in the corner needs to answer where the
  // finger is, not only where the cart is.
  const [added, setAdded] = useState(false)
  useEffect(() => {
    if (!added) return undefined
    const id = setTimeout(() => setAdded(false), 1300)
    return () => clearTimeout(id)
  }, [added])

  return (
    <section className={styles.stand}>
      <div className={styles.stage} ref={stageRef}>
        {/* A plinth for the jacket to stand on: two concentric hairlines, the
            inner one filled just enough to lift the product off the background.
            It sits before the jacket in the DOM, so it paints behind. */}
        <div className={styles.backdrop} aria-hidden="true">
          <span className={styles.ringOuter} />
          <span className={styles.ring} />
        </div>

        <div className={styles.glow} aria-hidden="true" />

        <AnimatePresence
          mode="popLayout"
          initial={false}
          custom={swap}
          // Fires on the frame the outgoing jacket is actually removed, which a
          // timer can only guess at.
          onExitComplete={onExitComplete}
        >
          <motion.img
            key={themeIndex}
            custom={swap}
            variants={jacketVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className={styles.jacket}
            src={theme.jacket}
            alt={`${theme.name} puffer jacket`}
            draggable="false"
          />
        </AnimatePresence>

        {/* Sits in the empty band the contained image leaves at the foot of the
            stage, so adding it costs the jacket no height and shifts nothing. */}
        <button
          className={styles.buy}
          type="button"
          onClick={() => {
            onBuy()
            setAdded(true)
            // Last, and never awaited: a browser that blocks audio, or has none,
            // must not be able to stop the thing actually being added.
            playAdded()
          }}
        >
          {/* Keyed, so the old label leaves and the new one arrives instead of
              the characters changing underneath a static button. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={added ? 'added' : 'buy'}
              className={styles.buyLabel}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {added && (
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              )}
              {added ? 'In cart' : 'Buy it'}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { NAV_FADE, TIMING } from '../animation.js'
import styles from './ProductStand.module.css'

/**
 * Both variants read the docking geometry measured at click time, so the two
 * jackets always share one continuous diagonal:
 *
 *   corner thumbnail  <->  centre stage  <->  "PUFFER JACKET" nav item
 *
 * Forward, the outgoing jacket shrinks up into the nav item while the next one
 * grows out of the corner thumbnail. Back, it runs exactly in reverse.
 */
const dock = ({ thumb, nav }, direction) => (direction > 0 ? nav : thumb)
const source = ({ thumb, nav }, direction) => (direction > 0 ? thumb : nav)

const jacketVariants = {
  enter: (swap) => ({
    ...source(swap, swap.direction),
    // Coming forward it starts exactly on the corner thumbnail, which switches
    // off at the same instant, so it is already solid there -- the new colour
    // is on screen from the first frame instead of fading up during the trip.
    // Coming back it starts on the nav item with nothing underneath it, so
    // there it does fade in rather than popping into existence.
    opacity: swap.direction > 0 ? 1 : 0,
  }),
  center: {
    x: 0,
    y: 0,
    scale: 1,
    opacity: 1,
    transition: {
      delay: TIMING.enterDelay,
      duration: TIMING.enterDuration,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: (swap) =>
    swap.direction > 0
      ? {
          // Docking into the nav item, with nothing underneath to take over,
          // so it fades out across the tail of the trip.
          ...dock(swap, swap.direction),
          opacity: [1, 1, 0],
          transition: {
            duration: TIMING.exitDuration,
            ease: [0.16, 1, 0.3, 1],
            opacity: {
              duration: TIMING.exitDuration,
              times: [0, NAV_FADE, 1],
              ease: 'linear',
            },
          },
        }
      : {
          // Landing in the corner slot: stays solid all the way down, and is
          // removed once the thumbnail underneath has taken over unnoticed.
          ...dock(swap, swap.direction),
          opacity: 1,
          transition: {
            duration: TIMING.exitDuration,
            ease: [0.16, 1, 0.3, 1],
          },
        },
}

export default function ProductStand({ theme, themeIndex, swap, stageRef, onBuy }) {
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

        <AnimatePresence mode="popLayout" initial={false} custom={swap}>
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

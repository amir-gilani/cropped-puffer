import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EDGE_FADE, ENTER_FADE, TIMING } from '../animation.js'
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
 * On that leg the fade is spent crossing the edge and nowhere else: solid
 * while it is properly on screen, gone by the time the frame would otherwise
 * cut it in half. It used to dock onto the nav item and dissolve there
 * instead, which had one jacket disappearing on the spot and the other
 * appearing on it.
 */
const dock = ({ thumb, above }, direction) => (direction > 0 ? above : thumb)
const source = ({ thumb, above }, direction) => (direction > 0 ? thumb : above)

const jacketVariants = {
  enter: (swap) => ({
    ...source(swap, swap.direction),
    // Forward it starts exactly on the corner thumbnail, which switches off at
    // the same instant, so it has to be solid there. Back it starts outside the
    // frame and comes up as it crosses the edge.
    opacity: swap.direction > 0 ? 1 : 0,
  }),
  center: (swap) => ({
    x: 0,
    y: 0,
    scale: 1,
    // The other half of the edge fade. Forward there is nothing to fade -- the
    // jacket is already solid on the corner it grows out of.
    opacity: 1,
    transition: {
      delay: TIMING.enterDelay,
      duration: TIMING.enterDuration,
      ease: [0.16, 1, 0.3, 1],
      ...(swap.direction > 0
        ? {}
        : {
            // A plain tween over the stretch the jacket spends at the edge, not
            // keyframes: a keyframe list whose first segment has no duration
            // came back down again afterwards instead of holding. ENTER_FADE is
            // a window into the move, not a single number, so it gives both when
            // the fade starts and how long it lasts -- multiplying the pair
            // itself by the duration is NaN, and a NaN duration is an animation
            // that never runs at all.
            opacity: {
              delay: TIMING.enterDelay + ENTER_FADE[0] * TIMING.enterDuration,
              duration: (ENTER_FADE[1] - ENTER_FADE[0]) * TIMING.enterDuration,
              ease: 'linear',
            },
          }),
    },
  }),
  exit: (swap) => ({
    ...dock(swap, swap.direction),
    // Going back it lands in the corner and has to stay solid the whole way,
    // because a thumbnail takes over from it there. Going forward it leaves
    // through the top edge, and fades as it crosses -- gone by the time the
    // frame would have cut it off, rather than snipped off mid-flight.
    opacity: swap.direction > 0 ? [1, 1, 0] : 1,
    transition: {
      duration: TIMING.exitDuration,
      ease: [0.16, 1, 0.3, 1],
      ...(swap.direction > 0
        ? {
            opacity: {
              duration: TIMING.exitDuration,
              times: [0, EDGE_FADE[0], EDGE_FADE[1]],
              ease: ['linear', 'linear'],
            },
          }
        : {}),
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

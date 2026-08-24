import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import styles from './ColorThumbnail.module.css'

/**
 * The colourway waiting in the wings. It fades out while a swap is in flight,
 * because during a swap the jacket in the air *is* this thumbnail -- and on the
 * way back it is switched on the moment that jacket is removed, never
 * alongside it: one image and one shadow in this corner at any instant.
 *
 * Only opacity is animated. Scaling or nudging it on the way in would read as a
 * pop the moment the arriving jacket hands over, since that jacket has already
 * come to rest at this exact size and position.
 */
const ColorThumbnail = forwardRef(function ColorThumbnail(
  { theme, hidden, fadeIn, fadeOut, onClick },
  ref,
) {
  return (
    <motion.button
      type="button"
      ref={ref}
      className={styles.thumb}
      onClick={onClick}
      aria-label={`Preview ${theme.name}`}
      // Invisible is not gone: an element at zero opacity still takes clicks
      // and still answers the Tab key, and this one is left standing whenever
      // there is nothing to preview -- so it has to be taken out of reach as
      // well as out of sight, or the empty corner steps the colourway.
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : 0}
      // Opacity is a plain CSS transition and NOT a Framer animation, because
      // on the way back this has to be able to switch on *now*, in the same
      // paint as the landed jacket being removed. Framer picks an `animate`
      // change up in a layout effect and lands the value on its next frame --
      // so even at `duration: 0` the corner was empty for one painted frame,
      // which is the wink you see as the jacket touches down. React writes a
      // `style` in the commit itself, and React batches that state change with
      // the removal, so the two happen in one frame with no hole between them.
      //
      // Framer still owns `transform` for the hover lift; the two never write
      // the same property.
      style={{
        pointerEvents: hidden ? 'none' : 'auto',
        opacity: hidden ? 0 : 1,
        transitionDuration: `${hidden ? fadeOut : fadeIn}s`,
      }}
      initial={false}
      whileHover={{ y: -4 }}
    >
      <img src={theme.jacket} alt="" draggable="false" />
    </motion.button>
  )
})

export default ColorThumbnail

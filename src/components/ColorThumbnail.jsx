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
const ColorThumbnail = forwardRef(function ColorThumbnail({ theme, hidden, fadeIn, fadeOut, onClick }, ref) {
  return (
    <motion.button
      type="button"
      ref={ref}
      className={styles.thumb}
      onClick={onClick}
      aria-label={`Preview ${theme.name}`}
      initial={false}
      animate={{ opacity: hidden ? 0 : 1 }}
      // `fadeIn` of 0 means it appears on the very next frame -- the caller
      // uses that when a jacket has already landed on this exact spot.
      transition={{ duration: hidden ? fadeOut : fadeIn, ease: 'linear' }}
      whileHover={{ y: -4 }}
    >
      <img src={theme.jacket} alt="" draggable="false" />
    </motion.button>
  )
})

export default ColorThumbnail

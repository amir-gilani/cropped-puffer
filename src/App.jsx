import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header.jsx'
import HeroSection from './components/HeroSection.jsx'
import Stepper from './components/Stepper.jsx'
import CartPanel from './components/CartPanel.jsx'
import ProductStand from './components/ProductStand.jsx'
import PurchasePanel from './components/PurchasePanel.jsx'
import ColorThumbnail from './components/ColorThumbnail.jsx'
import themeStates from './themeStates.js'
import styles from './App.module.css'
import {
  HANDOVER_MS,
  JACKET_RATIO,
  NAV_ANCHOR,
  EXIT_MS,
  PREVIEW_MS,
  SWAP_MS,
  THUMB_FADE_S,
} from './animation.js'

// The corner always holds the colourway the right arrow would bring in next --
// or, at the end of the line, the one the left arrow would bring back.
const previewFor = (index) => (index + 1 < themeStates.length ? index + 1 : index - 1)

export default function App() {
  const [index, setIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(() => previewFor(0))
  const [thumbHidden, setThumbHidden] = useState(false)
  // 0 means the corner snaps back on: going back, it is taking over from a
  // jacket already parked on top of it, so any fade would show.
  const [thumbFadeIn, setThumbFadeIn] = useState(THUMB_FADE_S)
  // Switching off is instant when a solid jacket is already covering that spot.
  const [thumbFadeOut, setThumbFadeOut] = useState(0.2)
  // True for the sliver of time a landed jacket is still sitting on the corner.
  const [thumbCovered, setThumbCovered] = useState(false)
  // The size lives here rather than in the panel that shows it, because the
  // Buy button under the jacket needs it too.
  const [size, setSize] = useState(36)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  // Docking geometry measured at click time and handed to the exiting jacket
  // through AnimatePresence's `custom`, so it never goes stale mid-swap.
  const [swap, setSwap] = useState({
    thumb: { x: 0, y: 0, scale: 0.3 },
    nav: { x: 0, y: 0, scale: 0.3 },
    direction: 1,
  })

  const stageRef = useRef(null)
  const thumbRef = useRef(null)
  const navRef = useRef(null)
  const timersRef = useRef([])

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }
  useEffect(() => clearTimers, [])

  // The thumbnail swaps its src mid-hand-over, so an undecoded image there
  // would blink instead of changing. The one on deck therefore has to be ready
  // immediately -- but the other three do not, and at roughly 800KB each,
  // fetching all five at once is a slow first paint for no benefit. The rest
  // follow once the browser is idle.
  useEffect(() => {
    const decode = (jacket) => {
      const preload = new Image()
      preload.src = jacket
    }
    themeStates.slice(0, 2).forEach(({ jacket }) => decode(jacket))

    const rest = () => themeStates.slice(2).forEach(({ jacket }) => decode(jacket))
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(rest, { timeout: 2500 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(rest, 1200)
    return () => clearTimeout(id)
  }, [])

  /**
   * The two docking slots, as offsets from the centre of the stage: the corner
   * thumbnail below right, and the "PUFFER JACKET" nav item above. Measured on
   * every click, so the path stays exact at any viewport size.
   */
  const measure = useCallback(() => {
    const stage = stageRef.current?.getBoundingClientRect()
    const thumb = thumbRef.current?.getBoundingClientRect()
    const nav = navRef.current?.getBoundingClientRect()
    const cx = stage ? stage.left + stage.width / 2 : window.innerWidth / 2
    const cy = stage ? stage.top + stage.height / 2 : window.innerHeight / 2

    // Both jackets are `object-fit: contain`, so the pixels actually drawn are
    // smaller than their boxes. Scaling by the boxes would land the flying
    // jacket near the thumbnail's size but not exactly on it, so compare the
    // fitted image rects instead. Both are centred in their box, so only the
    // size needs the correction -- the centres already line up.
    const image = thumbRef.current?.querySelector('img')
    const ratio =
      image?.naturalWidth && image?.naturalHeight
        ? image.naturalWidth / image.naturalHeight
        : JACKET_RATIO
    const fitted = (box) =>
      box.width / box.height > ratio
        ? { width: box.height * ratio, height: box.height }
        : { width: box.width, height: box.width / ratio }
    const drawn = stage?.width ? fitted(stage).width : 0

    return {
      thumb:
        thumb?.width && drawn
          ? {
              x: thumb.left + thumb.width / 2 - cx,
              y: thumb.top + thumb.height / 2 - cy,
              // Lands at pixel-for-pixel thumbnail size.
              scale: fitted(thumb).width / drawn,
            }
          : // Mobile: no thumbnail on screen, so travel off the bottom right.
            { x: window.innerWidth * 0.6, y: window.innerHeight * 0.6, scale: 0.3 },
      nav:
        nav?.width && drawn
          ? {
              // Aim at the left part of the label, not its centre.
              x: nav.left + nav.width * NAV_ANCHOR - cx,
              y: nav.top + nav.height / 2 - cy,
              scale: nav.width / drawn,
            }
          : // Mobile: the nav is hidden, so dock off the top of the screen.
            { x: -window.innerWidth * 0.25, y: -window.innerHeight * 0.6, scale: 0.3 },
    }
  }, [])

  const step = useCallback(
    (direction) => {
      const target = index + direction
      // Linear sequence, and one swap at a time.
      if (isAnimating || target < 0 || target >= themeStates.length) return

      clearTimers()
      setSwap({ ...measure(), direction })
      setIndex(target)
      setIsAnimating(true)

      setThumbHidden(true)

      // Going back, the outgoing jacket parks in the corner slot, so the
      // thumbnail takes over underneath it just before it lands -- instantly,
      // and with the same colourway, which is why the hand-over is invisible.
      // Going forward it docks into the nav instead, and the corner previews
      // the next colourway as soon as the incoming jacket has cleared that
      // slot -- not at the end of the swap, which showed as a late preview.
      const revealAt = direction > 0 ? PREVIEW_MS : HANDOVER_MS
      setThumbFadeIn(direction > 0 ? THUMB_FADE_S : 0)
      setThumbFadeOut(direction > 0 ? 0 : 0.2)
      setThumbCovered(direction < 0)
      timersRef.current = [
        setTimeout(() => {
          setPreviewIndex(previewFor(target))
          setThumbHidden(false)
        }, revealAt),
        // The jacket is gone; the corner takes its shadow back.
        setTimeout(() => setThumbCovered(false), EXIT_MS),
        setTimeout(() => setIsAnimating(false), SWAP_MS),
      ]
    },
    [index, isAnimating, measure],
  )

  const theme = themeStates[index]

  // A line is a colourway *and* a size: the same jacket in two sizes is two
  // different things to ship, so they cannot share a line.
  const addToCart = useCallback(() => {
    const id = `${theme.id}-${size}`
    setCart((lines) => {
      const existing = lines.find((line) => line.id === id)
      if (existing) {
        return lines.map((line) => (line.id === id ? { ...line, qty: line.qty + 1 } : line))
      }
      return [
        ...lines,
        { id, name: theme.name, jacket: theme.jacket, price: theme.price, size, qty: 1 },
      ]
    })
  }, [theme, size])

  const removeLine = useCallback((id) => {
    setCart((lines) => lines.filter((line) => line.id !== id))
  }, [])

  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0)

  return (
    <div
      className={styles.screen}
      style={{
        '--bg': theme.background,
        '--text': theme.text,
        '--muted': theme.muted,
        '--panel': theme.panel,
        '--nav-bar': theme.navBar,
        '--nav-text': theme.navText,
        '--shadow': theme.shadow,
        '--glow': theme.glow,
        '--glow-color': theme.glowColor,
        '--vignette': theme.vignette,
        '--vignette-color': theme.vignetteColor,
      }}
    >
      <Header
        ref={navRef}
        cartCount={cartCount}
        cartOpen={cartOpen}
        onCartClick={() => setCartOpen((open) => !open)}
      />

      <main className={styles.main}>
        <HeroSection
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          canPrev={index > 0}
          canNext={index < themeStates.length - 1}
          colourway={theme.name}
          index={index}
          total={themeStates.length}
        />
        <ProductStand
          theme={theme}
          themeIndex={index}
          swap={swap}
          stageRef={stageRef}
          onBuy={addToCart}
        />
        <PurchasePanel theme={theme} size={size} onSize={setSize} />
      </main>

      <CartPanel
        open={cartOpen}
        lines={cart}
        onClose={() => setCartOpen(false)}
        onRemove={removeLine}
      />

      <Stepper
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        canPrev={index > 0}
        canNext={index < themeStates.length - 1}
        index={index}
        total={themeStates.length}
      />

      {/* Breaks up banding across the big soft gradients. */}
      <div className={styles.grain} aria-hidden="true" />

      <ColorThumbnail
        ref={thumbRef}
        theme={themeStates[previewIndex]}
        hidden={thumbHidden}
        fadeIn={thumbFadeIn}
        fadeOut={thumbFadeOut}
        covered={thumbCovered}
        onClick={() => step(previewIndex > index ? 1 : -1)}
      />
    </div>
  )
}

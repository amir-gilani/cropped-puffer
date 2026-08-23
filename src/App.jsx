import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header.jsx'
import HeroSection from './components/HeroSection.jsx'
import Stepper from './components/Stepper.jsx'
import CartPanel from './components/CartPanel.jsx'
import PerformanceView from './components/PerformanceView.jsx'
import AboutView from './components/AboutView.jsx'
import ProductStand from './components/ProductStand.jsx'
import PurchasePanel from './components/PurchasePanel.jsx'
import ColorThumbnail from './components/ColorThumbnail.jsx'
import themeStates from './themeStates.js'
import styles from './App.module.css'
import {
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
  // The size lives here rather than in the panel that shows it, because the
  // Buy button under the jacket needs it too.
  const [size, setSize] = useState(36)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  // The section the reader is on, and so the nav item the white pill sits under.
  const [here, setHere] = useState('overview')
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
  const performanceRef = useRef(null)
  const aboutRef = useRef(null)
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
      // Fetching is not decoding. Left at the fetch, the first paint of a
      // colourway still pays to turn 800KB of PNG into a bitmap, and that bill
      // arrives on the frame it is first shown -- which is mid-swap, on the
      // thread running the swap. Decoding here moves it off that frame.
      preload.decode?.().catch(() => {})
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
    // The corner's *image*, not the button around it. They are not the same
    // rectangle: the button is 77.75 x 72 and the image inside it draws
    // 77.75 x 73.5, half a pixel lower. Measured against the button, the
    // jacket landed 2% small and slightly high, and the hand-over -- which
    // swaps one for the other in a single frame -- flicked.
    const image = thumbRef.current?.querySelector('img')
    const thumb = image?.getBoundingClientRect()
    const nav = navRef.current?.getBoundingClientRect()
    const cx = stage ? stage.left + stage.width / 2 : window.innerWidth / 2
    const cy = stage ? stage.top + stage.height / 2 : window.innerHeight / 2

    // Both jackets are `object-fit: contain`, so the pixels actually drawn are
    // smaller than their boxes. Scaling by the boxes would land the flying
    // jacket near the thumbnail's size but not exactly on it, so compare the
    // fitted image rects instead. Both are centred in their box, so only the
    // size needs the correction -- the centres already line up.
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

  // Puts the corner back, with whichever colourway is now on deck. Safe to call
  // twice: the second call finds nothing to change.
  const revealCorner = useCallback((target) => {
    setPreviewIndex(previewFor(target))
    setThumbHidden(false)
  }, [])

  // One gesture, one section. CSS snapping alone will not do this: it releases
  // to the *nearest* snap point, so anything short of half a screen springs
  // back where it came from -- a 400px flick on a 900px screen goes nowhere.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // A gesture is not over when a fixed timer says so. One swipe of a trackpad
    // keeps sending events for a second or more as its momentum decays, and a
    // timer that expires in the middle of that stream reads the rest of the
    // same swipe as a second gesture -- measured, twenty flicks over two
    // seconds skipped a whole section. So the lock is released only once the
    // wheel has actually gone quiet, and never before the scroll has landed.
    const QUIET = 160
    const SETTLE = reduce ? 80 : 620
    // How much wheel has to add up before it counts as a gesture. A mouse sends
    // one big notch; a precision trackpad sends a stream of small ones, and
    // some are only a pixel or two. Adding them up treats both the same.
    const TRIGGER = 34
    // And how far a finger has to travel on a touch screen to mean the same.
    const SWIPE = 44
    let locked = false
    let movedAt = 0
    let idle
    let rolled = 0
    let touchedAt = null
    // The size of the last wheel event, to tell a fresh push from the tail of
    // the one before it.
    let lastPush = 0

    const release = () => {
      const since = performance.now() - movedAt
      if (since < SETTLE) {
        idle = window.setTimeout(release, SETTLE - since)
        return
      }
      locked = false
      rolled = 0
      lastPush = 0
    }

    const sections = () => Array.from(document.querySelectorAll('[data-section]'))
    const move = (step) => {
      const all = sections()
      const here = Math.round(window.scrollY / window.innerHeight)
      const target = all[Math.min(all.length - 1, Math.max(0, here + step))]
      if (!target) return
      locked = true
      movedAt = performance.now()
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }

    const onWheel = (event) => {
      // Anything that scrolls on its own -- the cart's list -- keeps its wheel.
      if (event.target.closest?.('[data-scrollable]')) return
      // Always, whatever the size. Letting small deltas through meant a
      // trackpad's finer events scrolled the page natively a few pixels at a
      // time and drifted it off the section boundaries.
      event.preventDefault()
      // Every event restarts the quiet countdown, including the ones ignored
      // while locked: that is what keeps a decaying swipe as one gesture.
      window.clearTimeout(idle)
      idle = window.setTimeout(release, QUIET)

      // Some devices report lines rather than pixels.
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      const push = Math.abs(delta)
      // Inertia only ever fades. An event markedly bigger than the one before
      // is a finger pushing again, not the tail of the last swipe -- without
      // this, a trackpad's decay could hold the lock for seconds and swallow
      // the next deliberate gesture entirely.
      const pushedAgain = push > lastPush * 1.5 + 2
      lastPush = push

      if (locked) {
        if (!pushedAgain || performance.now() - movedAt < SETTLE) return
        locked = false
        rolled = 0
      }

      rolled += delta
      if (Math.abs(rolled) < TRIGGER) return
      const step = rolled > 0 ? 1 : -1
      rolled = 0
      move(step)
    }

    const KEYS = {
      ArrowDown: 1,
      PageDown: 1,
      ' ': 1,
      ArrowUp: -1,
      PageUp: -1,
    }
    const onKey = (event) => {
      const step = KEYS[event.key]
      if (!step || event.target.closest?.('input, textarea')) return
      event.preventDefault()
      if (locked) return
      move(step)
      window.clearTimeout(idle)
      idle = window.setTimeout(release, QUIET)
    }

    // A touch screen sends no wheel events at all, so without these the whole
    // handler is simply absent on a laptop that has one: the page falls back to
    // free scrolling and comes to rest between sections.
    const onTouchStart = (event) => {
      touchedAt = event.target.closest?.('[data-scrollable]') ? null : event.touches[0].clientY
    }

    const onTouchMove = (event) => {
      if (touchedAt === null) return
      event.preventDefault()
    }

    const onTouchEnd = (event) => {
      if (touchedAt === null) return
      const travelled = touchedAt - event.changedTouches[0].clientY
      touchedAt = null
      if (locked || Math.abs(travelled) < SWIPE) return
      move(travelled > 0 ? 1 : -1)
      window.clearTimeout(idle)
      idle = window.setTimeout(release, QUIET)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.clearTimeout(idle)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  // Which section the reader is on, which is what the header's white pill sits
  // under. Set on the click as well as by the observer, so the pill leaves the
  // instant an item is pressed rather than a smooth scroll later.
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('[data-section]'))
    if (!sections.length) return undefined
    const names = ['overview', 'performance', 'about']
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const name = names[sections.indexOf(entry.target)]
          if (name) setHere(name)
        })
      },
      // Half a screen: every section is a whole viewport, so only one of them
      // can hold that much at a time.
      { threshold: 0.5 },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const goTo = useCallback((target) => {
    setHere(target)
    const section = { performance: performanceRef, about: aboutRef }[target]
    if (section) section.current?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
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

      setThumbFadeIn(direction > 0 ? THUMB_FADE_S : 0)
      setThumbFadeOut(direction > 0 ? 0 : 0.2)

      // Going forward, the corner is emptied and previews the next colourway as
      // soon as the incoming jacket has cleared that slot -- waiting for the
      // whole swap showed as a late preview.
      //
      // Going back, the jacket lands *on* the corner, and nothing is put there
      // until it is gone: `onExitComplete` swaps one for the other on the frame
      // the jacket is removed. Earlier versions had the thumbnail arrive first
      // and juggle shadows underneath it, but two elements in one spot means
      // two shadows, two clocks and two chances to pulse. One at a time cannot
      // -- and putting the thumbnail up mid-flight also lands the new image's
      // decode in the middle of the animation, which is a stutter you can feel.
      timersRef.current = [
        direction > 0 &&
          setTimeout(() => {
            setPreviewIndex(previewFor(target))
            setThumbHidden(false)
          }, PREVIEW_MS),
        // Safety net: if the exit never completes -- an interrupted swap --
        // the corner must not be left empty.
        direction < 0 && setTimeout(() => revealCorner(target), EXIT_MS + 400),
        setTimeout(() => setIsAnimating(false), SWAP_MS),
      ].filter(Boolean)
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
      className={styles.page}
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
      {/* Both sections are mounted and reached by scrolling. The header belongs
          to the first screen only, so it leaves with it rather than following
          the reader down the page. */}
      <section className={styles.screen} data-section>
        <Header
          ref={navRef}
          onNavigate={goTo}
          here={here}
          cartCount={cartCount}
          cartOpen={cartOpen}
          onCartClick={() => setCartOpen((open) => !open)}
        />

        <main className={styles.main}>
          <div className={styles.columns}>
            <HeroSection />
            <ProductStand
              theme={theme}
              themeIndex={index}
              swap={swap}
              stageRef={stageRef}
              onBuy={addToCart}
              onExitComplete={() => revealCorner(index)}
            />
            <PurchasePanel theme={theme} size={size} onSize={setSize} />
          </div>
        </main>

        <Stepper
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          canPrev={index > 0}
          canNext={index < themeStates.length - 1}
          index={index}
          total={themeStates.length}
        />

        {/* On the last colourway there is nothing left to bring in, so the
            corner holds nothing: showing the one *behind* you there says the
            arrow will go forward when it can only go back. It stays mounted
            and merely invisible, because this is also the slot a jacket lands
            in on the way back -- unmounted, there would be no rectangle to
            measure and it would fly off the screen instead. */}
        <ColorThumbnail
          ref={thumbRef}
          theme={themeStates[previewIndex]}
          hidden={thumbHidden || index === themeStates.length - 1}
          fadeIn={thumbFadeIn}
          fadeOut={thumbFadeOut}
          onClick={() => step(previewIndex > index ? 1 : -1)}
        />
      </section>

      <section className={styles.section} ref={performanceRef} id="performance" data-section>
        <PerformanceView theme={theme} />
      </section>

      <section className={styles.section} ref={aboutRef} id="about" data-section>
        <AboutView />
      </section>

      <CartPanel
        open={cartOpen}
        lines={cart}
        onClose={() => setCartOpen(false)}
        onRemove={removeLine}
      />

      {/* Fixed, so the lighting, the grain and the frame stay with the viewport
          rather than scrolling away with the first screen. */}
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.frame} aria-hidden="true">
        <span className={styles.cornerTL} />
        <span className={styles.cornerTR} />
        <span className={styles.cornerBL} />
        <span className={styles.cornerBR} />
      </div>
    </div>
  )
}

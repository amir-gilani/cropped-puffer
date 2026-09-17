import jacketCream from './assets/jacket-cream.png'
import jacketRed from './assets/jacket-red.png'
import jacketOlive from './assets/jacket-olive.png'
import jacketNavy from './assets/jacket-navy.png'
import jacketBlack from './assets/jacket-black.png'

/**
 * `glow`/`glowColor` and `vignette`/`vignetteColor` drive the two lighting
 * layers that pull the eye to the middle of the screen: a pool of light behind
 * the jacket, and darkened edges around it. The light is tinted per theme --
 * warm on the maroon, cool steel on the black -- because a white pool over a
 * saturated background just desaturates it into grey. The edges are tinted too,
 * for the same reason: pure black over maroon reads as dirt, a deep plum of the
 * same family reads as shadow.
 *
 * `cloth` is the colourway's own colour, used by the thermal meter on the
 * specification screen. It is not the fabric's literal RGB: the meter is filled
 * over `background`, and every background here is a deep version of the
 * colourway it belongs to, so the literal value would sit on its own shade and
 * disappear. These are lifted away from their background far enough to read --
 * darker on the one light theme, lighter on the four dark ones.
 *
 * All five are the same photographed jacket, recoloured -- see
 * scripts/prepare-jackets.mjs.
 *
 * Each colourway carries its own price: the darker dyes and the coated shells
 * cost more to make, so the sequence climbs as it darkens.
 *
 * The linear sequence of colourways. Add another entry here and the arrows,
 * the corner preview and the background transition all pick it up for free.
 * Ordered light to dark, so stepping right dims the room.
 */
export const themeStates = [
  {
    id: 'cream',
    price: 149,
    was: 199,
    name: 'Coconut Milk',
    jacket: jacketCream,
    cloth: '#96835a',
    background: '#e6e0d3',
    text: '#17161a',
    muted: 'rgba(23, 22, 26, 0.55)',
    panel: 'rgba(23, 22, 26, 0.08)',
    navBar: 'rgba(23, 22, 26, 0.1)',
    navText: '#17161a',
    shadow: 'rgba(38, 32, 24, 0.35)',
    glow: 0.6,
    glowColor: '#ffffff',
    vignette: 0.3,
    vignetteColor: '#171512',
  },
  {
    id: 'red',
    price: 159,
    was: 209,
    name: 'Gym Red',
    jacket: jacketRed,
    cloth: '#c03a44',
    background: '#4a1116',
    text: '#f6ecec',
    muted: 'rgba(246, 236, 236, 0.6)',
    panel: 'rgba(246, 236, 236, 0.12)',
    navBar: 'rgba(10, 4, 5, 0.35)',
    navText: '#f6ecec',
    shadow: 'rgba(0, 0, 0, 0.5)',
    glow: 0.26,
    glowColor: '#ff9d74',
    vignette: 0.5,
    vignetteColor: '#170406',
  },
  {
    id: 'olive',
    price: 165,
    was: 215,
    name: 'Cargo Khaki',
    jacket: jacketOlive,
    cloth: '#8a9455',
    background: '#2f3524',
    text: '#eef0e4',
    muted: 'rgba(238, 240, 228, 0.58)',
    panel: 'rgba(238, 240, 228, 0.12)',
    navBar: 'rgba(8, 10, 5, 0.35)',
    navText: '#eef0e4',
    shadow: 'rgba(0, 0, 0, 0.5)',
    glow: 0.24,
    glowColor: '#dbe49b',
    vignette: 0.48,
    vignetteColor: '#0d1108',
  },
  {
    id: 'navy',
    price: 170,
    was: 220,
    name: 'Midnight Navy',
    jacket: jacketNavy,
    cloth: '#4c68b4',
    background: '#161e34',
    text: '#e8edf7',
    muted: 'rgba(232, 237, 247, 0.58)',
    panel: 'rgba(232, 237, 247, 0.12)',
    navBar: 'rgba(4, 7, 14, 0.38)',
    navText: '#e8edf7',
    shadow: 'rgba(0, 0, 0, 0.55)',
    glow: 0.22,
    glowColor: '#8fb6e8',
    vignette: 0.5,
    vignetteColor: '#050813',
  },
  {
    id: 'black',
    price: 179,
    was: 229,
    name: 'Onyx',
    jacket: jacketBlack,
    cloth: '#6e727c',
    background: '#111113',
    text: '#ffffff',
    muted: 'rgba(255, 255, 255, 0.55)',
    panel: 'rgba(255, 255, 255, 0.1)',
    navBar: 'rgba(255, 255, 255, 0.08)',
    navText: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.6)',
    glow: 0.2,
    glowColor: '#9db4d8',
    vignette: 0.55,
    vignetteColor: '#000000',
  },
]

export default themeStates

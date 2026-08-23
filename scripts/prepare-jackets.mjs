/**
 * Turns the uploaded product shots into transparent PNGs for src/assets/.
 *
 * The uploads are JPEGs, so the transparency checkerboard they were exported
 * with is baked into the pixels -- there is no alpha channel to read. This
 * rebuilds one: it finds the checkerboard by its own geometry, floods it in
 * from the edges (which also takes the drop shadow with it, since a shadow over
 * a checkerboard is still a checkerboard, only dimmer), then trims and scales
 * whatever is left.
 *
 * Run with: npm run jackets
 */
import jpeg from 'jpeg-js'
import { deflateSync, inflateSync } from 'node:zlib'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// Half of this is the widest the page can show the jacket before a 2x screen
// has to stretch it. The source is 1518px, so this is still a downscale.
const OUT_WIDTH = 1120

// How the background has to be identified: 'alpha' when the file already
// carries its own transparency and nothing has to be worked out, 'checker' for
// exports with a transparency checkerboard baked in, 'plain' for a shot on a
// real evenly lit backdrop, 'noisy' for one whose transparency was flattened
// into speckle and banding. All four stay supported.
const SOURCES = [
  ['assets-source/jacket-source.png', 'jacket', 'alpha'],
]

/**
 * The colourways, recoloured from that one photograph.
 *
 * Black cloth carries no hue to rotate, so a hue shift would return black. What
 * it does carry is shading -- the quilting, the folds, the sheen -- and that is
 * all in the luminance. So each variant treats luminance as a shading map,
 * normalises it against the garment's own range, and paints that shading onto a
 * target colour.
 *
 *   base   the colour the fabric reads as under full light
 *   floor  how dark the deepest folds go, as a fraction of base
 *   gamma  <1 lifts the mid-tones, so the quilting stays legible on dark bases
 *   spec   how much of the nylon's white sheen survives on top
 */
const VARIANTS = [
  { name: 'jacket-cream.png', base: [233, 226, 211], floor: 0.46, gamma: 0.8, spec: 0.5 },
  { name: 'jacket-red.png', base: [156, 32, 40], floor: 0.3, gamma: 0.85, spec: 0.72 },
  { name: 'jacket-olive.png', base: [104, 112, 62], floor: 0.32, gamma: 0.85, spec: 0.62 },
  { name: 'jacket-navy.png', base: [46, 64, 110], floor: 0.3, gamma: 0.85, spec: 0.68 },
  // The photograph as shot.
  { name: 'jacket-black.png', base: null },
]

/**
 * Minimal PNG reader for 8-bit RGB/RGBA, enough to take a source that already
 * carries its own alpha. Undoes the per-scanline filters PNG applies before
 * compression -- each row is stored as a difference against the row above, the
 * pixel to the left, or an average of the two, so it has to be replayed in
 * order rather than decoded row by row independently.
 */
function decodePng(buffer) {
  let width = 0
  let height = 0
  let colourType = 6
  const idat = []
  let i = 8
  while (i < buffer.length) {
    const len = buffer.readUInt32BE(i)
    const type = buffer.slice(i + 4, i + 8).toString('ascii')
    const body = buffer.slice(i + 8, i + 8 + len)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      if (body[8] !== 8) throw new Error('only 8-bit PNGs are supported')
      colourType = body[9]
      if (colourType !== 6 && colourType !== 2) throw new Error('only RGB/RGBA PNGs are supported')
    } else if (type === 'IDAT') {
      idat.push(body)
    } else if (type === 'IEND') {
      break
    }
    i += 12 + len
  }

  const channels = colourType === 6 ? 4 : 3
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = Buffer.alloc(width * height * 4, 255)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const row = Buffer.from(raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1)))
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels] : 0
      const b = prev[x]
      const c = x >= channels ? prev[x - channels] : 0
      let value = row[x]
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const pp = a + b - c
        const pa = Math.abs(pp - a)
        const pb = Math.abs(pp - b)
        const pc = Math.abs(pp - c)
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      row[x] = value & 0xff
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      out[o] = row[x * channels]
      out[o + 1] = row[x * channels + 1]
      out[o + 2] = row[x * channels + 2]
      if (channels === 4) out[o + 3] = row[x * channels + 3]
    }
    prev = row
  }
  return { data: out, width, height }
}

/**
 * The checker grid, measured rather than assumed: the squares are 20.33px, not
 * a round number, so a rounded guess drifts a full square across 1000px and the
 * phase test silently inverts halfway through the image.
 *
 * Takes the first and last edge along a scanline of pure background, counts how
 * many squares fit between them, and divides.
 */
function grid(lum, w, h, along) {
  const size = along === 'x' ? w : h
  const at = (i) => (along === 'x' ? lum[i] : lum[i * w])
  const edges = []
  for (let i = 1; i < size; i++) if (Math.abs(at(i) - at(i - 1)) > 25) edges.push(i - 0.5)
  if (edges.length < 3) return { step: 20.33, phase: 0 }
  const first = edges[0]
  const last = edges[edges.length - 1]
  const rough = (edges[1] - edges[0] + (edges[2] - edges[1])) / 2
  const spans = Math.max(1, Math.round((last - first) / rough))
  return { step: (last - first) / spans, phase: first }
}

/** Prefix-sum table, for constant-time window means at any radius. */
function integral(values, w, h) {
  const sum = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let row = 0
    for (let x = 0; x < w; x++) {
      row += values[y * w + x]
      sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row
    }
  }
  return sum
}
const windowSum = (sum, w, x0, y0, x1, y1) =>
  sum[(y1 + 1) * (w + 1) + x1 + 1] -
  sum[y0 * (w + 1) + x1 + 1] -
  sum[(y1 + 1) * (w + 1) + x0] +
  sum[y0 * (w + 1) + x0]

/**
 * A shot on a plain backdrop: grow inwards from the border, taking a pixel only
 * when it closely matches the neighbour that reached it. Comparing locally
 * rather than to one fixed colour is what lets it walk down the backdrop's
 * lighting gradient and swallow the soft contact shadow.
 *
 * A purely local test is not enough on its own: one soft edge anywhere on the
 * outline is a doorway, and the fill walks through it and eats the garment from
 * the inside -- it took 99.6% of this frame before the second condition below
 * was added. So each pixel must also stay within reach of the backdrop's own
 * brightness. The allowance is generous enough for a contact shadow and far too
 * tight for the garment.
 */
function plainBackground({ data, width: w, height: h }) {
  const lum = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    lum[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }
  const border = []
  for (let x = 0; x < w; x += 3) {
    border.push(lum[x], lum[(h - 1) * w + x])
  }
  for (let y = 0; y < h; y += 3) {
    border.push(lum[y * w], lum[y * w + w - 1])
  }
  border.sort((a, b) => a - b)
  const backdrop = border[Math.floor(border.length / 2)]
  const floor = backdrop * 0.35

  const bg = new Uint8Array(w * h)
  const stack = []
  const near = (i, j, tol) =>
    Math.abs(data[i * 4] - data[j * 4]) <= tol &&
    Math.abs(data[i * 4 + 1] - data[j * 4 + 1]) <= tol &&
    Math.abs(data[i * 4 + 2] - data[j * 4 + 2]) <= tol
  const seed = (x, y) => {
    const i = y * w + x
    if (!bg[i]) {
      bg[i] = 1
      stack.push(i)
    }
  }
  for (let x = 0; x < w; x++) {
    seed(x, 0)
    seed(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    seed(0, y)
    seed(w - 1, y)
  }
  while (stack.length) {
    const i = stack.pop()
    const x = i % w
    const y = (i - x) / w
    const around = []
    if (x > 0) around.push(i - 1)
    if (x < w - 1) around.push(i + 1)
    if (y > 0) around.push(i - w)
    if (y < h - 1) around.push(i + w)
    for (const j of around) {
      if (!bg[j] && lum[j] >= floor && near(i, j, 14)) {
        bg[j] = 1
        stack.push(j)
      }
    }
  }
  return bg
}

/**
 * A cut-out whose transparency was flattened into noise: dense speckle and
 * saturated banding where the background should be. Neither colour nor pattern
 * geometry identifies it -- the garment and the background are both mostly
 * black -- but roughness does. Across a small window the background scatters
 * wildly (standard deviation ~70) while the nylon is almost flat (~1 to 9).
 */
function noisyBackground({ data, width: w, height: h }, lum) {
  const sum = integral(lum, w, h)
  const squares = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) squares[i] = lum[i] * lum[i]
  const sumSq = integral(squares, w, h)

  const r = 3
  const mask = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r)
    const y1 = Math.min(h - 1, y + r)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(w - 1, x + r)
      const n = (x1 - x0 + 1) * (y1 - y0 + 1)
      const mean = windowSum(sum, w, x0, y0, x1, y1) / n
      const sd = Math.sqrt(Math.max(0, windowSum(sumSq, w, x0, y0, x1, y1) / n - mean * mean))
      const i = y * w + x
      const chroma =
        Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) -
        Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
      // Rough, or vividly coloured: either way it is not this black nylon.
      if (sd > 22 || chroma > 60) mask[i] = 1
    }
  }
  return mask
}

function buildAlpha({ data, width: w, height: h }, mode) {
  const lum = new Float32Array(w * h)
  const neutral = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b
    neutral[i] = Math.max(r, g, b) - Math.min(r, g, b) <= 16 ? 1 : 0
  }

  const plain = mode === 'plain'
  const noisy = mode === 'noisy'
  const gx = plain || noisy ? { step: 20, phase: 0 } : grid(lum, w, h, 'x')
  const gy = plain || noisy ? { step: 20, phase: 0 } : grid(lum, w, h, 'y')

  // Which phase of the checkerboard each pixel belongs to.
  const phase = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const cy = Math.floor((y - gy.phase) / gy.step)
    for (let x = 0; x < w; x++) {
      const cx = Math.floor((x - gx.phase) / gx.step)
      phase[y * w + x] = (cx + cy) & 1
    }
  }

  // Compare the two phases inside a small window. On checkerboard they differ
  // by a fixed proportion -- ~24%, and a drop shadow scales both alike, so it
  // still reads as checkerboard. On fleece the difference averages to nothing,
  // because the texture has no idea where the grid is.
  const lumPhase = new Float32Array(w * h)
  const lumOther = new Float32Array(w * h)
  const other = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    lumPhase[i] = lum[i] * phase[i]
    other[i] = 1 - phase[i]
    lumOther[i] = lum[i] * other[i]
  }
  const sumA = integral(lumPhase, w, h)
  const cntA = integral(phase, w, h)
  const sumB = integral(lumOther, w, h)
  const cntB = integral(other, w, h)

  const r = Math.round(gx.step * 1.5)
  const checker = noisy
    ? noisyBackground({ data, width: w, height: h }, lum)
    : new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r)
    const y1 = Math.min(h - 1, y + r)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (noisy || !neutral[i] || lum[i] < 60) continue
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(w - 1, x + r)
      const na = windowSum(cntA, w, x0, y0, x1, y1)
      const nb = windowSum(cntB, w, x0, y0, x1, y1)
      if (na < 4 || nb < 4) continue
      const a = windowSum(sumA, w, x0, y0, x1, y1) / na
      const b = windowSum(sumB, w, x0, y0, x1, y1) / nb
      if (Math.abs(a - b) / Math.max(a, b) > 0.09) checker[i] = 1
    }
  }

  // Only checkerboard reachable from the border counts as background, so a
  // chequer-like patch inside the garment cannot punch a hole through it.
  const bg = plain ? plainBackground({ data, width: w, height: h }) : new Uint8Array(w * h)
  const stack = []
  const push = (x, y) => {
    const i = y * w + x
    if (!bg[i] && checker[i]) {
      bg[i] = 1
      stack.push(i)
    }
  }
  if (!plain) {
    for (let x = 0; x < w; x++) {
      push(x, 0)
      push(x, h - 1)
    }
    for (let y = 0; y < h; y++) {
      push(0, y)
      push(w - 1, y)
    }
  }
  while (stack.length) {
    const i = stack.pop()
    const x = i % w
    const y = (i - x) / w
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }

  // Right along the silhouette the test weakens, because the window that should
  // see two clean phases sees garment as well. Grow the background inwards a
  // little, pixel by pixel, accepting only neutral pixels that closely match the
  // background pixel they touch -- that clears the halo and the soft shadow
  // hugging the outline without eating into the garment, whose colour differs
  // from the checkerboard by far more than this tolerance.
  const rgbNear = (i, j, tol) =>
    Math.abs(data[i * 4] - data[j * 4]) <= tol &&
    Math.abs(data[i * 4 + 1] - data[j * 4 + 1]) <= tol &&
    Math.abs(data[i * 4 + 2] - data[j * 4 + 2]) <= tol
  for (let pass = 0; pass < (plain || noisy ? 0 : 18); pass++) {
    const grown = []
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x
        if (bg[i] || !neutral[i]) continue
        for (const j of [i - 1, i + 1, i - w, i + w]) {
          if (bg[j] && rgbNear(i, j, 16)) {
            grown.push(i)
            break
          }
        }
      }
    }
    if (!grown.length) break
    for (const i of grown) bg[i] = 1
  }

  // Whatever foreground is left over in stray islands -- odd squares the phase
  // test missed out in the open -- is not the product. Keep the largest
  // connected blob and drop the rest.
  const largest = (mask) => {
    const seen = new Uint8Array(w * h)
    let best = null
    let bestSize = 0
    for (let start = 0; start < w * h; start++) {
      if (!mask[start] || seen[start]) continue
      const blob = [start]
      seen[start] = 1
      for (let k = 0; k < blob.length; k++) {
        const i = blob[k]
        const x = i % w
        const y = (i - x) / w
        const around = []
        if (x > 0) around.push(i - 1)
        if (x < w - 1) around.push(i + 1)
        if (y > 0) around.push(i - w)
        if (y < h - 1) around.push(i + w)
        for (const j of around) {
          if (mask[j] && !seen[j]) {
            seen[j] = 1
            blob.push(j)
          }
        }
      }
      if (blob.length > bestSize) {
        bestSize = blob.length
        best = blob
      }
    }
    const kept = new Uint8Array(w * h)
    if (best) for (const i of best) kept[i] = 1
    return kept
  }

  const foreground = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) foreground[i] = bg[i] ? 0 : 1
  const keep = largest(foreground)

  // A morphological opening shaves off the last few checker nubs still welded
  // to the silhouette -- anything narrower than the radius disappears, while
  // the garment itself, orders of magnitude thicker, keeps its shape.
  const RADIUS = 3
  const morph = (mask, pick) => {
    let cur = mask
    for (let pass = 0; pass < RADIUS; pass++) {
      const next = new Uint8Array(cur)
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x
          next[i] = pick(cur[i], cur[i - 1], cur[i + 1], cur[i - w], cur[i + w])
        }
      }
      cur = next
    }
    return cur
  }
  const opened = morph(
    morph(keep, (...v) => Math.min(...v)),
    (...v) => Math.max(...v),
  )

  // Opening can strand the far tip of a bridge it cut, so sweep the islands up
  // once more afterwards.
  const final = largest(opened)

  const alpha = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) alpha[i] = final[i] ? 255 : 0

  // Pull the edge in by a pixel, so the fringe where garment and checkerboard
  // blended together does not survive as a pale outline, then soften it.
  const eroded = new Float32Array(alpha)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (!alpha[i]) continue
      if (!alpha[i - 1] || !alpha[i + 1] || !alpha[i - w] || !alpha[i + w]) eroded[i] = 0
    }
  }
  let soft = eroded
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(soft)
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x
        next[i] = (soft[i] * 4 + soft[i - 1] + soft[i + 1] + soft[i - w] + soft[i + w]) / 8
      }
    }
    soft = next
  }
  return soft
}

/**
 * Lanczos-3 resampling, used when the source is smaller than the size the page
 * displays it at. It invents no detail -- nothing can -- but it is a far better
 * reconstruction than the bilinear stretch the browser would otherwise apply,
 * and doing it here means the image arrives at its display size already
 * resolved rather than being smeared on the way in.
 *
 * Works on premultiplied colour so the transparent surround, whose RGB is
 * meaningless, cannot bleed a halo into the edges.
 */
const lanczos = (x) => {
  if (x === 0) return 1
  const a = Math.abs(x)
  if (a >= 3) return 0
  const pix = Math.PI * a
  return (3 * Math.sin(pix) * Math.sin(pix / 3)) / (pix * pix)
}

function resample(src, sw, sh, dw, dh) {
  const plan = (from, to) => {
    const scale = to / from
    const support = scale < 1 ? 3 / scale : 3
    return Array.from({ length: to }, (_, o) => {
      const centre = (o + 0.5) / scale - 0.5
      const first = Math.max(0, Math.ceil(centre - support))
      const last = Math.min(from - 1, Math.floor(centre + support))
      const taps = []
      let total = 0
      for (let i = first; i <= last; i++) {
        const weight = lanczos(scale < 1 ? (i - centre) * scale : i - centre)
        if (weight !== 0) {
          taps.push([i, weight])
          total += weight
        }
      }
      return taps.map(([i, weight]) => [i, weight / total])
    })
  }

  const cols = plan(sw, dw)
  const rows = plan(sh, dh)
  const mid = new Float32Array(dw * sh * 4)
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (const [i, weight] of cols[x]) {
        const o = (y * sw + i) * 4
        r += src[o] * weight
        g += src[o + 1] * weight
        b += src[o + 2] * weight
        a += src[o + 3] * weight
      }
      const o = (y * dw + x) * 4
      mid[o] = r; mid[o + 1] = g; mid[o + 2] = b; mid[o + 3] = a
    }
  }

  const out = new Float32Array(dw * dh * 4)
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (const [i, weight] of rows[y]) {
        const o = (i * dw + x) * 4
        r += mid[o] * weight
        g += mid[o + 1] * weight
        b += mid[o + 2] * weight
        a += mid[o + 3] * weight
      }
      const o = (y * dw + x) * 4
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a
    }
  }
  return out
}

/**
 * Unsharp mask: add back a share of what a blur removes. Any resampling costs
 * acuity at the edges of the quilting and the seams; this restores the
 * impression of it. Kept mild -- pushed harder it starts drawing halos along
 * every seam, which reads as cheap.
 */
function sharpen(rgba, w, h, amount) {
  const blur = new Float32Array(rgba)
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(blur)
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const o = (y * w + x) * 4
        for (let c = 0; c < 3; c++) {
          next[o + c] =
            (blur[o + c] * 4 +
              blur[o - 4 + c] +
              blur[o + 4 + c] +
              blur[o - w * 4 + c] +
              blur[o + w * 4 + c]) /
            8
        }
      }
    }
    blur.set(next)
  }
  for (let i = 0; i < w * h; i++) {
    for (let c = 0; c < 3; c++) {
      rgba[i * 4 + c] += amount * (rgba[i * 4 + c] - blur[i * 4 + c])
    }
  }
}

/** Trim fully transparent margins, then resample towards OUT_WIDTH. */
function cropAndScale({ data, width: w, height: h }, alpha) {
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] > 6) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  const cw = x1 - x0 + 1
  const ch = y1 - y0 + 1

  // Premultiplied, so resampling cannot drag the colour of transparent pixels
  // into the silhouette.
  const cropped = new Float32Array(cw * ch * 4)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y + y0) * w + x + x0
      const a = alpha[i] / 255
      const o = (y * cw + x) * 4
      cropped[o] = data[i * 4] * a
      cropped[o + 1] = data[i * 4 + 1] * a
      cropped[o + 2] = data[i * 4 + 2] * a
      cropped[o + 3] = a * 255
    }
  }

  // Enlarging past roughly double stops buying anything: the reconstruction has
  // no more information to work with, and the file grows for nothing.
  const scale = Math.min(OUT_WIDTH / cw, 2)
  const ow = Math.max(1, Math.round(cw * scale))
  const oh = Math.max(1, Math.round(ch * scale))
  const scaled = resample(cropped, cw, ch, ow, oh)
  sharpen(scaled, ow, oh, scale > 1 ? 0.55 : 0.3)

  const out = Buffer.alloc(ow * oh * 4)
  for (let i = 0; i < ow * oh; i++) {
    const a = Math.max(0, Math.min(255, scaled[i * 4 + 3]))
    out[i * 4 + 3] = Math.round(a)
    if (a > 0) {
      for (let c = 0; c < 3; c++) {
        out[i * 4 + c] = Math.round(Math.max(0, Math.min(255, (scaled[i * 4 + c] / a) * 255)))
      }
    }
  }
  return { data: out, width: ow, height: oh }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/**
 * PNG stores each row as a difference against its neighbours, and which
 * difference to use is chosen per row. Writing every row unfiltered -- as this
 * did -- hands zlib raw pixel values with nothing repeating in them, and the
 * file comes out far larger than it needs to be. Trying all five filters per
 * row and keeping whichever leaves the smallest values is the standard
 * heuristic, and it pays for the resolution increase several times over.
 */
function filterRow(row, prev, bpp) {
  const n = row.length
  const paeth = (a, b, c) => {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }

  let best = null
  let bestCost = Infinity
  for (let type = 0; type < 5; type++) {
    const out = Buffer.alloc(n + 1)
    out[0] = type
    let cost = 0
    for (let i = 0; i < n; i++) {
      const a = i >= bpp ? row[i - bpp] : 0
      const b = prev[i]
      const c = i >= bpp ? prev[i - bpp] : 0
      let v
      if (type === 0) v = row[i]
      else if (type === 1) v = row[i] - a
      else if (type === 2) v = row[i] - b
      else if (type === 3) v = row[i] - ((a + b) >> 1)
      else v = row[i] - paeth(a, b, c)
      v &= 0xff
      out[i + 1] = v
      // Signed magnitude: values near zero on either side compress best.
      cost += v < 128 ? v : 256 - v
    }
    if (cost < bestCost) {
      bestCost = cost
      best = out
    }
  }
  return best
}

function png({ data, width, height }) {
  const stride = width * 4
  const rows = []
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < height; y++) {
    const row = data.slice(y * stride, (y + 1) * stride)
    rows.push(filterRow(row, prev, 4))
    prev = row
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Paint one colourway using the cut-out's own luminance as its shading. */
function recolour({ data, width, height }, variant) {
  const out = Buffer.from(data)
  if (!variant.base) return { data: out, width, height }

  const lum = []
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] > 200) {
      lum.push(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2])
    }
  }
  lum.sort((a, b) => a - b)
  const pick = (q) => lum[Math.min(lum.length - 1, Math.floor(lum.length * q))]
  // Normalise against the fabric's own range, not 0..255: this garment lives
  // between roughly 15 and 65, and stretching that is what makes the quilting
  // visible once it is no longer black.
  const lo = pick(0.02)
  const hi = Math.max(lo + 1, pick(0.9))
  const sheen = Math.max(hi + 1, pick(0.999))

  const [br, bg2, bb] = variant.base
  for (let i = 0; i < width * height; i++) {
    if (!data[i * 4 + 3]) continue
    const l = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
    const shade = Math.min(1, Math.max(0, (l - lo) / (hi - lo)))
    const lit = variant.floor + (1 - variant.floor) * Math.pow(shade, variant.gamma)
    // Anything brighter than the fabric's own top end is a specular highlight,
    // and highlights are the colour of the light, not of the cloth.
    const spec = Math.min(1, Math.max(0, (l - sheen) / (255 - sheen))) * variant.spec
    const paint = (c) => Math.round(Math.min(255, c * lit + (255 - c * lit) * spec))
    out[i * 4] = paint(br)
    out[i * 4 + 1] = paint(bg2)
    out[i * 4 + 2] = paint(bb)
  }
  return { data: out, width, height }
}

for (const [src, , mode] of SOURCES) {
  // Sources are kept only until their PNGs exist; a missing one is not an error.
  if (!existsSync(join(root, src))) {
    console.log('skip ' + src + ' (already converted, source removed)')
    continue
  }
  const file = readFileSync(join(root, src))
  const image = /.png$/i.test(src)
    ? decodePng(file)
    : jpeg.decode(file, { useTArray: true })
  // An 'alpha' source needs no cut-out: its own alpha channel is the mask.
  const mask = new Float32Array(image.width * image.height)
  if (mode === 'alpha') {
    for (let i = 0; i < mask.length; i++) mask[i] = image.data[i * 4 + 3]
  } else {
    mask.set(buildAlpha(image, mode))
  }
  const cutout = cropAndScale(image, mask)
  for (const variant of VARIANTS) {
    const encoded = png(recolour(cutout, variant))
    writeFileSync(join(root, 'src', 'assets', variant.name), encoded)
    console.log(
      src + ' -> ' + variant.name + '  ' + cutout.width + 'x' + cutout.height +
        '  ' + (encoded.length / 1024).toFixed(0) + 'KB',
    )
  }
}

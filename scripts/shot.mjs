/**
 * Screenshots the running dev server, so a change can be looked at rather than
 * only reasoned about.
 *
 * Uses the Chrome already installed on the machine (puppeteer-core downloads no
 * browser of its own). Chrome's own --screenshot flag cannot be used here: the
 * page is a scroll-snapping document, and a hash link is pulled back to the
 * first section before the capture happens, so the scroll has to be driven.
 *
 *   npm run shot                      both sections, 1440x900
 *   npm run shot -- --width=1200      a narrower window
 */
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((path) => existsSync(path))

const arg = (name, fallback) => {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`))
  return found ? found.split('=')[1] : fallback
}

const url = arg('url', 'http://localhost:5173/')
const width = Number(arg('width', 1440))
const height = Number(arg('height', 900))
const outDir = arg('out', 'shots')

if (!CHROME) throw new Error('No Chrome or Edge found to drive')
mkdirSync(outDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--hide-scrollbars', '--force-device-scale-factor=1'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width, height })
  await page.goto(url, { waitUntil: 'networkidle0' })
  // Let the entry animations settle before the shutter.
  await new Promise((r) => setTimeout(r, 900))

  // By name, not by index: several components render their own <section>, so
  // counting them lands on the wrong one.
  const targets = [
    ['top', null],
    ['performance', '#performance'],
  ]
  for (const [name, selector] of targets) {
    await page.evaluate((sel) => {
      if (sel) document.querySelector(sel)?.scrollIntoView({ behavior: 'instant', block: 'start' })
      else window.scrollTo({ top: 0, behavior: 'instant' })
    }, selector)
    // Scroll snapping and any whileInView animations both need a moment.
    await new Promise((r) => setTimeout(r, 1100))
    const file = join(outDir, `${name}.png`)
    await page.screenshot({ path: file })

    const box = await page.evaluate((sel) => {
      const node = sel ? document.querySelector(sel) : document.body
      const rect = node.getBoundingClientRect()
      return {
        top: Math.round(rect.top),
        height: Math.round(rect.height),
        viewport: window.innerHeight,
        scrollY: Math.round(window.scrollY),
      }
    }, selector)
    console.log(file, JSON.stringify(box))
  }
} finally {
  await browser.close()
}

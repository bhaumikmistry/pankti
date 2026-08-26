import { chromium } from 'playwright-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cardHtml } from './card.mjs'
import { SIZES, specFromIssue, slugFor } from './parse.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '..', 'out')

// Below this the quote is technically on the card and practically unreadable,
// so the run fails and says to trim rather than shipping something illegible.
const MIN_FONT = 26
const MAX_FONT = 132

/**
 * Binary search the largest font size whose text still fits.
 *
 * This is the part that cannot be done without a layout engine: "fill the
 * square" depends on where the lines break, which depends on the font size.
 */
async function fitText(page, height) {
  let lo = MIN_FONT
  let hi = MAX_FONT
  let best = null

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const fits = await page.evaluate((size) => {
      const q = document.getElementById('quote')
      const stage = document.getElementById('stage')
      q.style.fontSize = `${size}px`
      void stage.offsetHeight // force layout

      // The space actually available, once the card's padding is taken out.
      const cs = getComputedStyle(document.body)
      const available =
        document.body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      return stage.scrollHeight <= available
    }, mid)

    if (fits) { best = mid; lo = mid + 1 } else { hi = mid - 1 }
  }

  if (best === null) return { size: null, fits: false }
  await page.evaluate((size) => {
    document.getElementById('quote').style.fontSize = `${size}px`
  }, best)
  return { size: best, fits: true }
}

export async function renderCard(spec, { outDir = OUT } = {}) {
  const size = SIZES[spec.size] || SIZES.square
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({
      viewport: { width: size.w, height: size.h },
      deviceScaleFactor: 1,
    })
    await page.setContent(cardHtml(spec), { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)

    const { size: fontSize, fits } = await fitText(page, size.h)
    if (!fits) {
      throw new Error(
        `The quote will not fit at a readable size. It is ${spec.quote.length} characters; ` +
          `try trimming it, or choose the portrait or story format.`
      )
    }

    // How far the content escapes its padded box, measured after fitting.
    // Positive means something is being cut off at the edge of the card, which
    // is exactly the failure a screenshot hides and a byte count cannot see.
    const overflow = await page.evaluate(() => {
      const stage = document.getElementById('stage').getBoundingClientRect()
      const cs = getComputedStyle(document.body)
      const top = parseFloat(cs.paddingTop)
      const bottom = document.body.clientHeight - parseFloat(cs.paddingBottom)
      return Math.round(Math.max(top - stage.top, stage.bottom - bottom, 0))
    })

    mkdirSync(outDir, { recursive: true })
    const file = join(outDir, `${slugFor(spec)}.png`)
    await page.screenshot({ path: file, type: 'png' })
    return { file, fontSize, overflow, width: size.w, height: size.h }
  } finally {
    await browser.close()
  }
}

/** Entry point for the workflow: reads the issue JSON, writes the card. */
async function main() {
  const raw = process.env.ISSUE_JSON
  if (!raw) {
    console.error('ISSUE_JSON is not set')
    process.exit(1)
  }
  const issue = JSON.parse(raw)
  const { spec, problems } = specFromIssue(issue)

  if (problems.length) {
    // Surfaced on the issue by the workflow, so the fix is obvious.
    writeFileSync(join(OUT, '..', 'render-error.txt'), problems.join('\n'))
    console.error(problems.join('\n'))
    process.exit(2)
  }

  try {
    const out = await renderCard(spec)
    const summary = {
      file: out.file.split('/').slice(-2).join('/'),
      fontSize: out.fontSize,
      dimensions: `${out.width}x${out.height}`,
      theme: spec.theme,
      chars: spec.quote.length,
    }
    writeFileSync(join(OUT, '..', 'render-result.json'), JSON.stringify(summary, null, 2))
    console.log(JSON.stringify(summary, null, 2))
  } catch (e) {
    writeFileSync(join(OUT, '..', 'render-error.txt'), e.message)
    console.error(e.message)
    process.exit(2)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main()

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { cardHtml } from './template.mjs'

const fontDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts')

/**
 * Fonts are inlined as data URIs rather than linked.
 *
 * Chromium in the runner has no system fonts to fall back on and no reason to
 * be allowed out to the network mid render. Inlining also means a card made in
 * January looks identical to one made in June, because the bytes are pinned in
 * the repo rather than fetched from Google.
 */
const face = (family, file) =>
  `@font-face { font-family: '${family}'; src: url(data:font/ttf;base64,${readFileSync(join(fontDir, file)).toString('base64')}) format('truetype'); }`

const FONT_CSS = [
  face('CardSerif', 'Newsreader.ttf'),
  face('CardDeva', 'NotoSerifDevanagari.ttf'),
  face('CardSans', 'Inter.ttf'),
].join('\n')

/** The design lives in template.mjs so the web page renders the same card. */
export const buildCard = (spec, opts) => cardHtml(spec, FONT_CSS, opts)

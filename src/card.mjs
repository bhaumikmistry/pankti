import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { THEMES, SIZES } from './parse.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const fontDir = join(here, '..', 'fonts')

/**
 * Fonts are inlined as data URIs rather than linked.
 *
 * Chromium in the runner has no system fonts to fall back on and no reason to
 * be allowed out to the network mid render. Inlining also means a card made in
 * January looks identical to one made in June, because the bytes are pinned in
 * the repo rather than fetched from Google.
 */
const font = (file) => readFileSync(join(fontDir, file)).toString('base64')

const FONTS = {
  serif: font('Newsreader.ttf'),
  devanagari: font('NotoSerifDevanagari.ttf'),
  sans: font('Inter.ttf'),
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/**
 * The card is a webpage, which is the whole reason for rendering it in a
 * browser: line breaking, quote marks and Devanagari shaping are the browser's
 * problem rather than something to reimplement.
 *
 * Font size is not set here. render.mjs measures and shrinks it to fit, since
 * "make it fill the square" cannot be answered without laying the text out.
 */
export function cardHtml(spec) {
  const t = THEMES[spec.theme] || THEMES.paper
  const s = SIZES[spec.size] || SIZES.square
  const lines = spec.quote.split('\n')

  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  @font-face { font-family: 'CardSerif'; src: url(data:font/ttf;base64,${FONTS.serif}) format('truetype'); }
  @font-face { font-family: 'CardDeva'; src: url(data:font/ttf;base64,${FONTS.devanagari}) format('truetype'); }
  @font-face { font-family: 'CardSans'; src: url(data:font/ttf;base64,${FONTS.sans}) format('truetype'); }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${s.w}px; height: ${s.h}px; }
  body {
    background: ${t.bg};
    color: ${t.ink};
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: ${Math.round(s.w * 0.11)}px;
    /* Devanagari first so Indic text picks up a font that shapes it; the serif
       covers Latin, and the browser falls through per glyph. */
    font-family: 'CardSerif', 'CardDeva', Georgia, serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  /* A flex parent centring an oversized child overflows above and below, and
     body.scrollHeight cannot see the half above. The fitter measures this
     instead, which has a real height either way. */
  #stage { width: 100%; }

  #quote {
    font-size: 64px;           /* replaced by the fitter */
    line-height: 1.34;
    letter-spacing: -0.015em;
    text-wrap: balance;
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }
  #quote .mark {
    font-size: 1.9em;
    line-height: 0;
    vertical-align: -0.28em;
    color: ${t.accent};
    margin-right: 0.06em;
  }

  #attrib {
    margin-top: ${Math.round(s.w * 0.055)}px;
    display: flex;
    align-items: center;
    gap: ${Math.round(s.w * 0.022)}px;
  }
  /* The dash the attribution hangs off, rather than an em dash in the text. */
  #attrib .rule {
    width: ${Math.round(s.w * 0.072)}px;
    height: 2px;
    background: ${t.accent};
    flex: none;
  }
  #attrib .who {
    font-family: 'CardSans', 'CardDeva', system-ui, sans-serif;
    font-size: ${Math.round(s.w * 0.026)}px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  #attrib .src {
    font-family: 'CardSans', 'CardDeva', system-ui, sans-serif;
    font-size: ${Math.round(s.w * 0.022)}px;
    font-style: italic;
    color: ${t.accent};
    letter-spacing: 0.01em;
    text-transform: none;
    font-weight: 400;
  }
</style></head>
<body>
  <main id="stage">
  <div id="quote"><span class="mark">&ldquo;</span>${lines.map(esc).join('\n')}</div>
  ${
    spec.author || spec.source
      ? `<div id="attrib">
    <span class="rule"></span>
    <div>
      ${spec.author ? `<div class="who">${esc(spec.author)}</div>` : ''}
      ${spec.source ? `<div class="src">${esc(spec.source)}</div>` : ''}
    </div>
  </div>`
      : ''
  }
  </main>
</body></html>`
}

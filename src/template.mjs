/**
 * The card itself, shared by the workflow and the web page.
 *
 * Neither side owns the design. The Action reads the fonts off disk and the
 * page fetches them, but both pass the resulting @font-face rules in here, so
 * a card made in a browser is the same card the Action commits.
 */

export const THEMES = {
  paper: { bg: '#f4f1ea', ink: '#16150f', rule: '#c9c2b0', accent: '#8a7f63' },
  ink: { bg: '#12140f', ink: '#ece9df', rule: '#33372c', accent: '#9aa285' },
  sky: { bg: '#eaf0f4', ink: '#0f1a22', rule: '#b3c6d2', accent: '#5c7d92' },
  rose: { bg: '#f6edea', ink: '#231411', rule: '#d8c0b7', accent: '#a06a58' },
}

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080x1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080x1350' },
  story: { w: 1080, h: 1920, label: 'Story 1080x1920' },
}

/**
 * Which face sets the quote. The Devanagari family is always in the stack
 * behind it, so Indic text keeps a font that shapes it whichever is chosen.
 *
 * Adding one means dropping a .ttf in fonts/, adding a line to FONT_FILES in
 * src/card.mjs and site/app.js, and adding an entry here.
 */
export const FONTS = {
  serif: { label: 'Serif', stack: "'CardSerif', 'CardDeva', Georgia, serif" },
  sans: { label: 'Sans', stack: "'CardSans', 'CardDeva', system-ui, sans-serif" },
}

/** Both bounds scale with the card, so one ceiling is not baked in at one width. */
export const maxFont = (w) => Math.round(w * 0.2)
export const minFont = (w) => Math.round(w * 0.024)

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/**
 * `root` is the element the card's own styles hang off. In a page that is
 * `body`, but the download path serialises the card into an SVG foreignObject
 * where the content is a plain div, and body rules simply never applied: the
 * export came out with no background, no padding and no centring.
 */
export function cardCss({ theme = 'paper', w = 1080, h = 1080, padding, lineHeight = 1.34, root = 'body', font = 'serif' } = {}) {
  const t = THEMES[theme] || THEMES.paper
  const pad = padding ?? Math.round(w * 0.11)
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  ${root === 'body' ? 'html, body' : root} { width: ${w}px; height: ${h}px; }
  ${root} {
    background: ${t.bg};
    color: ${t.ink};
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: ${pad}px;
    /* Devanagari first so Indic text picks up a font that shapes it; the serif
       covers Latin, and the browser falls through per glyph. */
    font-family: ${(FONTS[font] || FONTS.serif).stack};
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  /* A flex parent centring an oversized child overflows above and below, and
     body.scrollHeight cannot see the half above. The fitter measures this. */
  #stage { width: 100%; }

  #quote {
    font-size: 64px;
    line-height: ${lineHeight};
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
    margin-top: ${Math.round(w * 0.055)}px;
    display: flex;
    align-items: center;
    gap: ${Math.round(w * 0.022)}px;
  }
  #attrib .rule { width: ${Math.round(w * 0.072)}px; height: 2px; background: ${t.accent}; flex: none; }
  #attrib .who {
    font-family: 'CardSans', 'CardDeva', system-ui, sans-serif;
    font-size: ${Math.round(w * 0.026)}px;
    font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  }
  #attrib .src {
    font-family: 'CardSans', 'CardDeva', system-ui, sans-serif;
    font-size: ${Math.round(w * 0.022)}px;
    font-style: italic; color: ${t.accent}; letter-spacing: 0.01em; font-weight: 400;
  }`
}

export function cardBody(spec) {
  const lines = String(spec.quote || '').split('\n')
  const attrib =
    spec.author || spec.source
      ? `<div id="attrib">
    <span class="rule"></span>
    <div>
      ${spec.author ? `<div class="who">${esc(spec.author)}</div>` : ''}
      ${spec.source ? `<div class="src">${esc(spec.source)}</div>` : ''}
    </div>
  </div>`
      : ''
  return `<main id="stage">
  <div id="quote"><span class="mark">“</span>${lines.map(esc).join('\n')}</div>
  ${attrib}
  </main>`
}

/** A whole document, for the browser to screenshot. */
export function cardHtml(spec, fontCss, opts = {}) {
  const s = SIZES[spec.size] || SIZES.square
  if (spec.font && !opts.font) opts = { ...opts, font: spec.font }
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
${fontCss}
${cardCss({ theme: spec.theme, w: s.w, h: s.h, ...opts })}
</style></head>
<body>${cardBody(spec)}</body></html>`
}

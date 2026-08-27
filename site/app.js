import { THEMES, SIZES, FONTS, cardCss, cardBody, maxFont, minFont } from './template.mjs'

const $ = (id) => document.getElementById(id)
const ui = {
  quote: $('quote'), author: $('author'), source: $('source'),
  w: $('w'), h: $('h'), lh: $('lh'), pad: $('pad'), fs: $('fs'), auto: $('auto'),
  wv: $('wv'), hv: $('hv'), lhv: $('lhv'), padv: $('padv'), fsv: $('fsv'),
  themes: $('themes'), presets: $('presets'), fonts: $('fonts'),
  frame: $('frame'), meta: $('meta'), download: $('download'), asIssue: $('asIssue'), copy: $('copy'),
}

let theme = 'paper'
let font = 'serif'
let fontCss = ''
/** [{ family, css }], so the export can inline only the faces it needs. */
let FACES = []

/**
 * The card is drawn in an iframe rather than in the page.
 *
 * It needs its own html and body to be sized and centred, and its CSS resets
 * everything, so it cannot share a document with the controls. The iframe also
 * means measuring it is the same operation the Action performs in Chromium.
 */
const frameEl = document.createElement('iframe')
frameEl.style.border = '0'
frameEl.style.display = 'block'
ui.frame.appendChild(frameEl)

/**
 * Fonts are fetched once and inlined as data URIs.
 *
 * They have to be inline rather than linked, because the download path
 * serialises the card into an SVG and a linked font would not resolve inside
 * it. Same reason the Action inlines them.
 */
async function loadFonts() {
  // Mirrors FONT_FILES in src/card.mjs. Adding a face means both lists.
  const files = [
    ['CardSerif', 'Newsreader.ttf'],
    ['CardDeva', 'NotoSerifDevanagari.ttf'],
    ['CardSans', 'Inter.ttf'],
  ]
  FACES = await Promise.all(
    files.map(async ([family, file]) => {
      const buf = await (await fetch(`./fonts/${file}`)).arrayBuffer()
      let bin = ''
      const bytes = new Uint8Array(buf)
      const CHUNK = 0x8000
      for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
      }
      return {
        family,
        css: `@font-face { font-family: '${family}'; src: url(data:font/ttf;base64,${btoa(bin)}) format('truetype'); }`,
      }
    })
  )
  return FACES.map((f) => f.css).join('\n')
}

/**
 * Every control is a query parameter, so a card is a link.
 *
 * That is the whole reason this is on Pages rather than behind a function: a
 * static file on a CDN has no compute to exhaust and nothing to bill, so a
 * link can be handed out without it becoming a liability.
 */
const PARAMS = {
  quote: { el: () => ui.quote },
  author: { el: () => ui.author },
  source: { el: () => ui.source },
  w: { el: () => ui.w },
  h: { el: () => ui.h },
  lh: { el: () => ui.lh },
  pad: { el: () => ui.pad },
  fs: { el: () => ui.fs },
}

function readParams() {
  const q = new URLSearchParams(location.search)

  // The markup ships a filled-in example so the page is not blank on a first
  // visit. Once a link carries any parameters it is describing a specific
  // card, and anything it leaves out has to be empty rather than inheriting
  // the demo: a link with no author was printing "John Salvatier" under
  // someone else's words.
  const isLink = [...q.keys()].length > 0
  if (isLink) {
    ui.quote.value = ''
    ui.author.value = ''
    ui.source.value = ''
  }

  for (const [key, def] of Object.entries(PARAMS)) {
    if (q.has(key)) def.el().value = q.get(key)
  }
  if (q.has('theme') && THEMES[q.get('theme')]) theme = q.get('theme')
  if (q.has('font') && FONTS[q.get('font')]) font = q.get('font')
  if (q.has('size') && SIZES[q.get('size')]) {
    ui.w.value = SIZES[q.get('size')].w
    ui.h.value = SIZES[q.get('size')].h
  }
  // Anything but auto=0 keeps the fitter on, since that is the useful default.
  if (q.get('auto') === '0') ui.auto.checked = false
  return { download: q.get('download') === '1' }
}

/**
 * Kept in the address bar as things change, so the link in the bar is always
 * the card on screen. replaceState rather than pushState: every slider nudge
 * filling the back button would be miserable.
 */
function writeParams() {
  const q = new URLSearchParams()
  q.set('quote', ui.quote.value)
  if (ui.author.value.trim()) q.set('author', ui.author.value.trim())
  if (ui.source.value.trim()) q.set('source', ui.source.value.trim())
  q.set('theme', theme)
  if (font !== 'serif') q.set('font', font)
  q.set('w', ui.w.value)
  q.set('h', ui.h.value)
  if (+ui.lh.value !== 1.34) q.set('lh', ui.lh.value)
  if (+ui.pad.value !== 11) q.set('pad', ui.pad.value)
  if (!ui.auto.checked) { q.set('auto', '0'); q.set('fs', ui.fs.value) }
  history.replaceState(null, '', `?${q}`)
}

const spec = () => ({
  quote: ui.quote.value,
  author: ui.author.value.trim(),
  source: ui.source.value.trim(),
})

const dims = () => ({ w: +ui.w.value, h: +ui.h.value })

/** The same binary search the Action runs, against the same measurement. */
function fit(doc, width) {
  let lo = minFont(width)
  let hi = maxFont(width)
  let best = null
  const q = doc.getElementById('quote')
  const stage = doc.getElementById('stage')
  const body = doc.body

  const fits = (size) => {
    q.style.fontSize = `${size}px`
    void stage.offsetHeight
    const cs = doc.defaultView.getComputedStyle(body)
    const available = body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    return stage.scrollHeight <= available
  }

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (fits(mid)) { best = mid; lo = mid + 1 } else { hi = mid - 1 }
  }
  if (best === null) { q.style.fontSize = `${minFont(width)}px`; return { size: minFont(width), fits: false } }
  q.style.fontSize = `${best}px`
  return { size: best, fits: true }
}

function overflowOf(doc) {
  const stage = doc.getElementById('stage').getBoundingClientRect()
  const cs = doc.defaultView.getComputedStyle(doc.body)
  const top = parseFloat(cs.paddingTop)
  const bottom = doc.body.clientHeight - parseFloat(cs.paddingBottom)
  return Math.round(Math.max(top - stage.top, stage.bottom - bottom, 0))
}

function render() {
  const { w, h } = dims()
  const s = spec()
  const padding = Math.round((w * +ui.pad.value) / 100)

  const doc = frameEl.contentDocument
  doc.open()
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}\n${cardCss({
      theme, w, h, padding, lineHeight: +ui.lh.value, font,
    })}</style></head><body>${cardBody(s)}</body></html>`
  )
  doc.close()

  frameEl.width = w
  frameEl.height = h

  const done = () => {
    let size
    let fitted = true
    if (ui.auto.checked) {
      const r = fit(doc, w)
      size = r.size
      fitted = r.fits
      ui.fs.value = size
    } else {
      size = +ui.fs.value
      doc.getElementById('quote').style.fontSize = `${size}px`
    }
    ui.fsv.textContent = `${size}px`

    const over = overflowOf(doc)
    ui.meta.innerHTML =
      `<span>${w} x ${h}</span><span>${size}px type</span><span>${s.quote.length} characters</span>` +
      (over > 0
        ? `<span class="${fitted ? 'warn' : 'err'}">cut off by ${over}px</span>`
        : '<span>nothing cut off</span>')

    scaleToFit(w, h)
    writeParams()
  }

  // Fonts are already in the parent document's cache, but the iframe still has
  // to apply them before anything can be measured.
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(done)
  else setTimeout(done, 30)
}

/** Show the card at whatever fits on screen, without changing its real size. */
function scaleToFit(w, h) {
  const availW = ui.frame.parentElement.clientWidth - 56
  const availH = window.innerHeight - 200
  const scale = Math.min(1, availW / w, availH / h)
  frameEl.style.transformOrigin = 'top left'
  frameEl.style.transform = `scale(${scale})`
  ui.frame.style.width = `${w * scale}px`
  ui.frame.style.height = `${h * scale}px`
}

/**
 * Download by serialising the card into an SVG foreignObject and painting that
 * onto a canvas. No server, and it keeps the browser's own layout, which is
 * the whole point of building the card as a webpage.
 */
async function download() {
  ui.download.disabled = true
  try {
    await rasterise()
  } catch (e) {
    // A silent failure here looks like a dead button.
    ui.meta.innerHTML = `<span class="err">${e.message}</span>`
  } finally {
    ui.download.disabled = false
  }
}

async function rasterise() {
  const { w, h } = dims()
  const doc = frameEl.contentDocument
  const body = doc.body.innerHTML

  // Only the faces this card actually uses. All three is two megabytes of
  // base64 in every export, and the Devanagari face is dead weight for a
  // Latin quote.
  const needed = new Set(['CardSerif', 'CardSans'])
  if (/[\u0900-\u097F]/.test(doc.body.textContent || '')) needed.add('CardDeva')

  // Rebuilt from the template rather than read back off the live document, so
  // the export cannot drift from what the preview and the Action produce.
  const style =
    FACES.filter((f) => needed.has(f.family)).map((f) => f.css).join('\n') +
    '\n' +
    cardCss({
      theme, w, h,
      padding: Math.round((w * +ui.pad.value) / 100),
      lineHeight: +ui.lh.value,
      font,
      root: '#cardroot',
    }) +
    `\n#quote { font-size: ${doc.getElementById('quote').style.fontSize}; }`

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<foreignObject width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml">` +
    `<style>${style}</style>` +
    `<div id="cardroot">${body}</div>` +
    `</div></foreignObject></svg>`

  // A data: URL, not a blob:. Chromium treats an SVG image loaded from a blob
  // URL as tainting the canvas, so toBlob then refuses to export it. Same
  // bytes, different scheme, and the export works.
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

  const img = new Image()
  await new Promise((res, rej) => {
    img.onload = res
    img.onerror = () => rej(new Error('could not rasterise the card'))
    img.src = url
  })

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0)
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('the browser produced no image')

  // Four random characters, so downloading three variations does not leave you
  // with "quote (1).png" and "quote (2).png" and no idea which is which.
  const id = Math.random().toString(36).slice(2, 6)
  const a = document.createElement('a')
  a.download = `pankti-${w}x${h}-${id}.png`
  a.href = URL.createObjectURL(blob)
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function buildChips() {
  for (const [name, t] of Object.entries(THEMES)) {
    const b = document.createElement('button')
    b.className = 'chip'
    b.type = 'button'
    b.setAttribute('aria-pressed', String(name === theme))
    b.innerHTML = `<span class="sw" style="background:${t.bg}"></span>${name}`
    b.onclick = () => {
      theme = name
      ;[...ui.themes.children].forEach((c) => c.setAttribute('aria-pressed', String(c === b)))
      render()
    }
    ui.themes.appendChild(b)
  }

  for (const [key, f] of Object.entries(FONTS)) {
    const b = document.createElement('button')
    b.className = 'chip'
    b.type = 'button'
    b.textContent = f.label
    b.setAttribute('aria-pressed', String(key === font))
    b.onclick = () => {
      font = key
      ;[...ui.fonts.children].forEach((c) => c.setAttribute('aria-pressed', String(c === b)))
      render()
    }
    ui.fonts.appendChild(b)
  }

  for (const [key, s] of Object.entries(SIZES)) {
    const b = document.createElement('button')
    b.className = 'chip'
    b.type = 'button'
    b.textContent = `${key} ${s.w}x${s.h}`
    b.onclick = () => {
      ui.w.value = s.w
      ui.h.value = s.h
      sync()
      render()
    }
    ui.presets.appendChild(b)
  }
}

function sync() {
  ui.wv.textContent = `${ui.w.value}px`
  ui.hv.textContent = `${ui.h.value}px`
  ui.lhv.textContent = (+ui.lh.value).toFixed(2)
  ui.padv.textContent = `${ui.pad.value}%`
  // The slider stays visible either way. Hidden behind the checkbox it looked
  // like the control did not exist, and it is the one people go looking for.
  ui.fs.style.opacity = ui.auto.checked ? '0.5' : '1'
}

function issueUrl() {
  const s = spec()
  const p = new URLSearchParams({
    template: 'quote.yml',
    title: `Card: ${s.quote.slice(0, 50)}`,
    quote: s.quote,
    author: s.author,
    source: s.source,
  })
  return `https://github.com/bhaumikmistry/pankti/issues/new?${p}`
}

for (const el of [ui.quote, ui.author, ui.source]) el.addEventListener('input', render)
for (const el of [ui.w, ui.h, ui.lh, ui.pad]) {
  el.addEventListener('input', () => { sync(); render() })
}

// Reaching for the type size means you want that size, so it stops fitting.
ui.fs.addEventListener('input', () => {
  ui.auto.checked = false
  sync()
  render()
})
ui.auto.addEventListener('change', () => { sync(); render() })
ui.download.addEventListener('click', download)
ui.copy.addEventListener('click', async () => {
  // The link already describes the card. Adding download=1 makes it produce
  // one on open, which is what makes it worth handing to someone.
  const url = `${location.origin}${location.pathname}${location.search}&download=1`
  try {
    await navigator.clipboard.writeText(url)
    ui.copy.textContent = 'copied'
  } catch {
    ui.copy.textContent = 'press ctrl+c'
    prompt('Copy this link', url)
  }
  setTimeout(() => (ui.copy.textContent = 'Copy link'), 1400)
})
ui.asIssue.addEventListener('click', (e) => { e.target.href = issueUrl() })
window.addEventListener('resize', () => scaleToFit(+ui.w.value, +ui.h.value))

buildChips()
const boot = readParams()
// The chips are built before the URL is read, so the pressed ones may be wrong.
;[...ui.themes.children].forEach((c) =>
  c.setAttribute('aria-pressed', String(c.textContent.trim() === theme))
)
;[...ui.fonts.children].forEach((c) =>
  c.setAttribute('aria-pressed', String(c.textContent.trim() === (FONTS[font] || {}).label))
)
sync()
ui.download.disabled = true
ui.meta.textContent = 'loading fonts…'
fontCss = await loadFonts()
ui.download.disabled = false
render()

if (boot.download) {
  // Wait for the fitter to settle, or the card downloads at the wrong size.
  setTimeout(async () => {
    try {
      await rasterise()
    } catch {
      // Some browsers refuse a download that no click asked for. Say so rather
      // than looking broken.
      ui.meta.innerHTML = '<span class="warn">Your browser blocked the automatic download. Use the button.</span>'
    }
  }, 400)
}

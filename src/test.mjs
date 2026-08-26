import { readFileSync, rmSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseIssueBody, specFromIssue, slugFor } from './parse.mjs'
import { renderCard } from './render.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const TMP = join(here, '..', 'out', '_test')

let pass = 0
let fail = 0
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok    ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? `  ${detail}` : ''}`) }
}

const form = (fields) =>
  Object.entries(fields).map(([k, v]) => `### ${k}\n\n${v}`).join('\n\n')

// ── parsing ───────────────────────────────────────────────────────────────
console.log('\nparsing')

const f = parseIssueBody(form({ Quote: 'hello\nworld', Author: 'Someone', Theme: 'Ink' }))
ok('reads every field', f.quote === 'hello\nworld' && f.author === 'Someone')
ok('keeps newlines inside a field', f.quote.includes('\n'))

const blank = parseIssueBody('### Author\n\n_No response_')
ok('_No response_ becomes empty', blank.author === '')

const dd = specFromIssue({ body: form({ Quote: 'x', Size: 'Portrait 1080x1350', Theme: 'Sky' }), number: 3 })
ok('dropdown label maps to key', dd.spec.size === 'portrait' && dd.spec.theme === 'sky', `got ${dd.spec.size}/${dd.spec.theme}`)

const fallback = specFromIssue({ body: 'no template here', title: 'A bare title', number: 4 })
ok('falls back to the issue title', fallback.spec.quote === 'A bare title')
ok('unknown theme falls back to paper', fallback.spec.theme === 'paper')

const empty = specFromIssue({ body: '', title: '', number: 5 })
ok('empty quote is reported', empty.problems.length === 1)

const huge = specFromIssue({ body: form({ Quote: 'x'.repeat(700) }), number: 6 })
ok('over-long quote is reported', huge.problems.some((p) => p.includes('700')))

const s1 = slugFor({ number: 7, quote: 'Reality has a surprising amount of detail' })
const s2 = slugFor({ number: 7, quote: 'Reality has a surprising amount of detail' })
ok('slug is stable', s1 === s2 && s1 === '0007-reality-has-a-surprising-amount-of-detail', `got ${s1}`)
ok('slug survives non-latin', /^0008-/.test(slugFor({ number: 8, quote: 'एक भी काम की नहीं निकली' })))

// ── rendering ─────────────────────────────────────────────────────────────
console.log('\nrendering')
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

const png = (file) => {
  const b = readFileSync(file)
  // PNG header, then the IHDR width/height as big-endian uint32.
  const isPng = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  return { isPng, w: b.readUInt32BE(16), h: b.readUInt32BE(20), bytes: b.length }
}

const short = await renderCard(
  { number: 1, quote: 'Reality has a surprising amount of detail.', author: 'John Salvatier', source: '', theme: 'paper', size: 'square' },
  { outDir: TMP }
)
let m = png(short.file)
ok('square is a real 1080x1080 png', m.isPng && m.w === 1080 && m.h === 1080, `${m.w}x${m.h}`)
ok('short quote gets a large size', short.fontSize > 70, `got ${short.fontSize}px`)

const long = await renderCard(
  { number: 2, quote: 'x '.repeat(140).trim(), author: 'Someone', source: 'A book', theme: 'ink', size: 'square' },
  { outDir: TMP }
)
ok('long quote shrinks to fit', long.fontSize < short.fontSize, `${long.fontSize}px vs ${short.fontSize}px`)
ok('long quote stays readable', long.fontSize >= 26, `got ${long.fontSize}px`)

const deva = await renderCard(
  { number: 3, quote: 'एक भी काम की नहीं निकली,\nहाथ भरा पड़ा है लकीरों से', author: 'अज्ञात', source: '', theme: 'rose', size: 'square' },
  { outDir: TMP }
)
m = png(deva.file)
ok('devanagari renders', m.isPng && m.bytes > 20000, `${m.bytes} bytes`)

const portrait = await renderCard(
  { number: 4, quote: 'Two lines\nof verse', author: '', source: '', theme: 'sky', size: 'portrait' },
  { outDir: TMP }
)
m = png(portrait.file)
ok('portrait is 1080x1350', m.w === 1080 && m.h === 1350, `${m.w}x${m.h}`)

const a = await renderCard({ number: 9, quote: 'Same in, same out.', author: 'A', source: '', theme: 'paper', size: 'square' }, { outDir: TMP })
const b = await renderCard({ number: 9, quote: 'Same in, same out.', author: 'A', source: '', theme: 'paper', size: 'square' }, { outDir: TMP })
ok('render is deterministic', readFileSync(a.file).equals(readFileSync(b.file)))

let refused = false
try {
  await renderCard({ number: 5, quote: 'word '.repeat(900).trim(), author: '', source: '', theme: 'paper', size: 'square' }, { outDir: TMP })
} catch (e) {
  refused = /will not fit/.test(e.message)
}
ok('refuses what cannot be read', refused)

console.log(`\n  ${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)

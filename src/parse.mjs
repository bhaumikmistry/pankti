import { THEMES, SIZES } from './template.mjs'
export { THEMES, SIZES }

/**
 * Turns a GitHub issue body into a card spec.
 *
 * The body comes from an Issue Form, which renders each field as a `### Label`
 * heading followed by the value. That is a stable shape to parse, and far more
 * reliable than asking for free text and hoping.
 */

const DEFAULTS = { theme: 'paper', size: 'square', author: '', source: '' }

/** `### Quote\n\nthe text` -> { quote: 'the text' }, for every field present. */
export function parseIssueBody(body = '') {
  const text = String(body).replace(/\r\n/g, '\n')
  const fields = {}

  // Issue Forms render an unfilled optional field as the literal _No response_.
  const sections = text.split(/^###\s+/m).slice(1)
  for (const section of sections) {
    const nl = section.indexOf('\n')
    if (nl === -1) continue
    const key = section.slice(0, nl).trim().toLowerCase()
    const value = section.slice(nl + 1).trim()
    fields[key] = /^_no response_$/i.test(value) ? '' : value
  }
  return fields
}

/**
 * A dropdown's value is its label, so `Rose, warm pink` has to come back to
 * `rose`.
 *
 * This used to test whether the label contained a key anywhere, which picked
 * `ink` out of `warm pink` and quietly rendered the wrong theme. The label's
 * first word is the key, and the fallback is a whole-word match rather than a
 * substring one.
 */
function pick(value, table, fallback) {
  const v = String(value || '').trim().toLowerCase()
  if (!v) return fallback
  if (table[v]) return v

  const first = v.split(/[^a-z0-9]+/).filter(Boolean)[0]
  if (first && table[first]) return first

  const words = new Set(v.split(/[^a-z0-9]+/).filter(Boolean))
  return Object.keys(table).find((k) => words.has(k)) || fallback
}

export function specFromIssue({ body, title, number }) {
  const f = parseIssueBody(body)

  // The form field wins; the issue title is the fallback so a plain issue with
  // no template still produces something rather than failing.
  const quote = (f.quote || title || '').trim()
  const spec = {
    number: number ?? 0,
    quote,
    author: (f.author || DEFAULTS.author).trim(),
    source: (f.source || f['source or book'] || DEFAULTS.source).trim(),
    theme: pick(f.theme, THEMES, DEFAULTS.theme),
    size: pick(f.size || f.format, SIZES, DEFAULTS.size),
  }

  const problems = []
  if (!spec.quote) problems.push('No quote. Fill in the Quote field.')
  // Past this length nothing legible fits, whatever the auto-fit does.
  if (spec.quote.length > 600) {
    problems.push(`Quote is ${spec.quote.length} characters. Trim it to 600 or fewer.`)
  }
  return { spec, problems }
}

/** Short, stable and filesystem safe. The same issue always yields the same name. */
export function slugFor(spec) {
  const base = (spec.quote || 'quote')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter(Boolean)
    .slice(0, 7)
    .join('-')
  return `${String(spec.number).padStart(4, '0')}-${base || 'quote'}`.slice(0, 72)
}

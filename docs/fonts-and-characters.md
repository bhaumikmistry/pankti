# Fonts, scripts and awkward characters

Everything below was checked by rendering it, not assumed.

## The three bundled fonts

| Family | File | Covers |
|---|---|---|
| `CardSerif` | `Newsreader.ttf` | Latin, the default face for the quote |
| `CardSans` | `Inter.ttf` | Latin, the attribution, and `font=sans` |
| `CardDeva` | `NotoSerifDevanagari.ttf` | Devanagari |

They are committed rather than fetched, so a card made today matches one made
next year and a render needs no network. `CardDeva` sits behind whichever face
is chosen, so Hindi in the middle of an English sentence still shapes properly.

## Choosing a face

`font=serif` or `font=sans`. Serif is the default.

## Adding a face

Four steps, and the last one is the one people forget.

1. Drop a `.ttf` in `fonts/`.
2. Add it to `FONT_FILES` in `src/card.mjs`, which is what the Action inlines.
3. Add it to the same list in `site/app.js`, which is what the page fetches.
4. Add an entry to `FONTS` in `src/template.mjs` with a stack that keeps
   `'CardDeva'` behind it.

**It has to be a static font, not a variable one.** A variable `.ttf` works in
the browser, so the page and the Action are fine, but nothing downstream that
parses font tables will cope: Satori's opentype fork throws outright on the
`fvar` table. `Newsreader[opsz,wght].ttf` is variable and works here only
because Chromium does all the work. Prefer a static instance.

Weight, italics and small caps are not exposed. The quote is one weight by
design; a card that needs bold in the middle of it is a different tool.

## Scripts

| | |
|---|---|
| Latin | Bundled. |
| Devanagari | Bundled, correctly shaped. Matras attach, conjuncts form, nukta sits right. |
| Urdu, Arabic | **Not bundled.** Renders correctly here because Chromium falls back to a system font, and it survives the download. But it depends on the machine doing the rendering, so it will differ between your laptop and the Action runner, and between two visitors. Bundle a Naskh face if it matters. |
| Anything else | Same caveat as Urdu. It will probably work and it is not guaranteed. |

## Characters

**Newlines are kept.** `%0A` in a URL, a real line break in the issue form. A
couplet stays two lines. This is the main reason the quote is a textarea and
not an input.

**The opening quote mark is drawn for you**, in the accent colour, hanging
left. Do not type one at the start; you will get two.

**Ampersands, angle brackets and quotes are escaped** on the way in, so
`Salt & pepper <tags>` renders as written rather than breaking the markup.

**Em dashes, en dashes, curly quotes and apostrophes** all render. In a URL
they must be percent-encoded like anything else.

**Emoji render in colour**, but from the system font, not from anything
bundled. The consequence is that the same card looks different on a Mac, on
Windows and in the Action runner, and a runner with no emoji font at all will
produce empty boxes. Fine for something you are eyeballing, not something to
rely on.

**Mathematical and Greek characters** work from the bundled faces where the
face has them, and fall back to the system otherwise.

## The one hard limit

Below 2.4% of the card width, the text is refused rather than shrunk further.
A quote nobody can read is not a card. Past roughly 400 characters on a square,
switch to portrait or trim.

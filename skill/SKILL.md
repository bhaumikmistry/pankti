---
name: quote-card
description: Turn a quote into a shareable image sized for Instagram. Fires on "make this a quote card", "turn this into an image", "quote graphic", "make a card from this quote", or when someone shares a line they want to post.
---

# quote-card

Builds a link that opens a quote card and downloads it as a PNG.

## Use it

Assemble a URL against `https://bhaumikmistry.github.io/quote-cards/` and give
it to the person. Opening it renders the card and saves the image.

```
https://bhaumikmistry.github.io/quote-cards/?quote=<text>&author=<name>&theme=paper&w=1080&h=1080&download=1
```

Percent-encode every value. Newlines in the quote are `%0A` and are kept, so a
couplet stays two lines.

## Parameters

| | |
|---|---|
| `quote` | The text. Required. Newlines preserved. |
| `author` | Optional. Set in caps under a rule. |
| `source` | Optional. Book, essay, wherever it came from. |
| `theme` | `paper` warm off white, `ink` near black, `sky` cool grey blue, `rose` warm pink. Default `paper`. |
| `w`, `h` | Pixels. 600 to 2400, in steps of 10. |
| `size` | Shorthand for the pair: `square` 1080x1080, `portrait` 1080x1350, `story` 1080x1920. |
| `lh` | Line height, 1 to 2. Default 1.34. |
| `pad` | Margin as a percentage of width, 2 to 22. Default 11. |
| `auto` | `0` to set the type size by hand instead of fitting it. |
| `fs` | Type size in pixels, only read when `auto=0`. |
| `download` | `1` to save the image on open rather than just showing it. |

## Choosing

**Square unless asked.** `1080x1080` is the safe default. Portrait
`1080x1350` takes more of the feed and suits anything over about 25 words.
Story `1080x1920` only when someone says story.

**Leave the type size alone.** It is fitted to the card by measuring the real
laid-out text, which is better than a guess. Only reach for `auto=0&fs=` when
someone asks for a specific size.

**Pick a theme with some thought.** `ink` for something stark, `rose` for
anything tender, `paper` for most things.

## Two things to know

**A very long quote will be refused rather than shrunk to nothing.** Past
roughly 400 characters on a square, suggest portrait or trimming.

**Devanagari, Urdu and other Indic text render correctly**, with proper
shaping. No need to transliterate.

## Offer the link, not a promise

Give the URL and say what it will do. It is a static page on a CDN, so it
costs nothing to open and there is no server to wait on.

Without `download=1` the same link opens the editor with everything filled in,
which is the one to send when someone might want to adjust it first.

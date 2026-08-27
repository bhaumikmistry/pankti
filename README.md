# pankti

_पंक्ति, a line of verse._

Type a quote, get an image sized for Instagram.

**[bhaumikmistry.github.io/pankti](https://bhaumikmistry.github.io/pankti/)** for the page, or open an issue and get a pull request with the image.

![](https://raw.githubusercontent.com/bhaumikmistry/pankti/main/out/sample.png)

## From an issue

1. [New issue](../../issues/new?template=quote.yml), fill in the quote and who said it.
2. A workflow renders it and opens a pull request with the image in the body.
3. Right click the image to save it, or take it from Files changed.
4. Merge the pull request and the issue closes itself.

Edit the issue and it re-renders onto the same branch, so the open pull request
updates rather than a second one appearing.

## What comes out

1080x1080 by default, which is what Instagram wants. Portrait 1080x1350 and
story 1080x1920 are options on the form.

The quote is set as large as it can be while still fitting, found by binary
search over the real laid-out text. Under 26px it gives up and comments on the
issue asking you to trim, because a card nobody can read is not a card.

## Why a browser and not Pillow

Text layout is the entire job here, and a browser is very good at it: line
breaking, quote marks, and Devanagari and Urdu shaping all come for free.
Pillow needs libraqm for complex scripts and hand-rolled wrapping for the rest.
Designing the card in CSS also means it can be opened in a browser rather than
run through the workflow to see what changed.

Fonts are committed rather than fetched, so a card made today matches one made
next year, and the render works with no network.

## Locally

```sh
npm ci
npx playwright install chromium
npm test
```

`npm test` renders real cards into `out/_test/` and checks the PNG headers,
that long quotes shrink, that Devanagari comes out, and that the same input
twice gives byte-identical output.

## From a link

Every control is a query parameter, so a card is a URL:

```
https://bhaumikmistry.github.io/pankti/?quote=Keep%20going.&author=Anon&theme=ink&size=square&download=1
```

With `download=1` the image saves on open. Without it, the editor opens with
everything filled in. [skill/SKILL.md](skill/SKILL.md) documents the parameters
for an agent to build these.

This is on Pages rather than behind a function on purpose. A static file on a
CDN has no compute to exhaust and nothing to bill, so the link can be handed
out without becoming a liability.

## Fonts and awkward characters

[docs/fonts-and-characters.md](docs/fonts-and-characters.md) covers which
scripts are bundled and which lean on the system, how to add a face, why it has
to be a static font, and what happens to emoji, newlines and ampersands.

## From the page

The page runs the same fitter and the same card template the Action does, in
your own browser. Nothing is uploaded: the fonts are fetched once, the card is
laid out in an iframe, and the download serialises that into an SVG and paints
it onto a canvas.

Sliders for width, height, line height and margin, four themes, and a switch to
set the type size by hand instead of fitting it.

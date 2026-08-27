# pankti

_पंक्ति, a line of verse._

<img src="https://raw.githubusercontent.com/bhaumikmistry/pankti/main/out/hero.png" width="420">

A line worth keeping usually arrives as text and has to leave as an image. This
turns one into the other, and nothing else.

**[bhaumikmistry.github.io/pankti](https://bhaumikmistry.github.io/pankti/)**

## Three ways in

**A link.** Every control is a query parameter, so a card is a URL. With
`download=1` the image saves on open.

```
https://bhaumikmistry.github.io/pankti/?quote=Keep%20going.&author=Anon&theme=ink&size=square&download=1
```

**The page.** Sliders for size, line height and margin, four themes, two faces,
and a live preview at full resolution.

**An issue.** [Open one](../../issues/new?template=quote.yml) and a workflow
renders the card and opens a pull request with the image in it. Merge and the
issue closes itself.

## Why it is shaped like this

The page is static, on a CDN. There is no endpoint that renders on demand,
because that is compute somebody else can spend and a bill you did not agree
to. Rendering happens in the browser of whoever opens the link.

The card is a webpage screenshotted by a real browser rather than drawn with a
graphics library, because text layout is the entire job. Line breaking, quote
marks and Devanagari shaping come free that way; the alternative is
reimplementing all three. The type size is found by binary search against the
laid-out text, which is the only honest answer to "fill the square".

Fonts are committed, not fetched, so a card made today matches one made next
year.

## More

- [skill/SKILL.md](skill/SKILL.md), for an agent building these links
- [docs/fonts-and-characters.md](docs/fonts-and-characters.md), what renders,
  what leans on the reader's system, and how to add a face

## Locally

```sh
npm ci
npx playwright install chromium
npm test
```

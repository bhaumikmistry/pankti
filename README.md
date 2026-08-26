# quote-cards

Open an issue with a quote. Get back a pull request with the image.

![](https://raw.githubusercontent.com/bhaumikmistry/quote-cards/main/out/sample.png)

## Using it

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

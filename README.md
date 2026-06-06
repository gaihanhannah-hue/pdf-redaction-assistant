# PDF Redaction Assistant

A client-side PDF review workspace for finding sensitive-looking dates and
person names before a reviewer decides what to redact. The app renders uploaded
PDFs in the browser, extracts text with `pdf.js`, maps detected entities back to
page coordinates, and overlays review highlights on the live document.

## Live Demo

Open the public GitHub Pages site:

https://gaihanhannah-hue.github.io/pdf-redaction-assistant/

To use it, open the link in any modern browser, click **Choose PDF**, and upload
a PDF from your computer. The app runs in the browser, so the document is loaded
locally on your device while you review detected dates, names, search matches,
and optional redaction exports.

## Quick Start

```bash
npm install
npm run dev
```

Open the local Vite URL, upload a PDF, then use the entity panel to jump between
detected dates and names. A sample document is included at
`public/sample-sensitive-document.pdf`.

## Features

- Three-panel review layout: thumbnails, PDF viewer, entity panel.
- Client-side PDF upload and rendering with `pdf.js`.
- Page thumbnails with active-page feedback.
- Date and name detection with transparent rule labels.
- Highlight overlays in distinct colors: yellow for dates, blue for names.
- Multiple selected entities can remain highlighted together.
- Search box for arbitrary terms, highlighted in green.
- Selected review queue for focused follow-up.
- Arrow-key navigation through detected entities.
- Friendly handling for non-PDF uploads and PDFs with no detected entities.

## Architecture

The app is intentionally split by responsibility:

- `src/lib/pdf.ts` loads the PDF, renders pages/thumbnails, and extracts text
  items with PDF coordinates.
- `src/lib/coordinates.ts` converts text item boxes into smaller highlight boxes
  for substring matches.
- `src/lib/entityExtraction.ts` owns the date, name, and search matching rules.
- `src/components/PdfViewer.tsx` renders canvases and positions highlights.
- `src/components/EntityPanel.tsx` manages entity review, search, and queue UI.

The core entity model keeps content and geometry together:

```ts
type Entity = {
  id: string
  type: 'date' | 'name' | 'search'
  text: string
  pageIndex: number
  bbox: { x: number; y: number; width: number; height: number }
  rule: string
}
```

This makes the UI state simple: selecting an entity means the viewer can scroll
to `pageIndex` and render `bbox` as an overlay.

## Entity Extraction Approach

The app does not use a backend, external API, or AI service. It uses local
pattern matching over `pdf.js` text items.

Date rules include:

- `DD/MM/YYYY`, e.g. `12/01/2024`
- `DD-MM-YYYY`, e.g. `12-01-2024`
- `DD-Mon-YYYY`, e.g. `03-Feb-2024`
- `Month DD, YYYY`, e.g. `January 12, 2024`
- `DD Month YYYY`, e.g. `12 January 2024`
- `YYYY-MM-DD`, e.g. `2024-01-12`

Name detection uses a Title Case heuristic for two to four capitalized words,
including apostrophe and hyphen variants such as `Mary O'Brien`. This is a
deliberate tradeoff: it is browser-safe and explainable, but may produce false
positives for organizations, headings, or addresses.

## Coordinate Mapping

`pdf.js` exposes each text item with a transform and dimensions. The app:

1. Applies the page viewport transform to each text item.
2. Builds a CSS-space bounding box for the rendered page scale.
3. For matches inside a longer text item, estimates the substring box by
   proportional character width.
4. Renders a positioned overlay button on top of the canvas.

This works well for normal text PDFs. It can be less exact when a PDF splits one
word across multiple text items, uses unusual glyph spacing, or is scanned and
has no selectable text.

## Known Limitations

- Scanned/image-only PDFs need OCR, which is out of scope for this client-only
  version.
- Regex-based name detection is useful but not perfect.
- Some PDFs split text in ways that make substring highlight boxes approximate.
- Redaction export is not implemented in v1 because reliable black-box export is
  a larger PDF editing problem than visual review.

## Suggested Demo Flow

1. Run `npm install && npm run dev`.
2. Upload `public/sample-sensitive-document.pdf`.
3. Click a date in the right panel and confirm the viewer jumps to that page.
4. Click a name and confirm both the list row and document highlight update.
5. Search for `Alice` and confirm green search highlights appear.
6. Use arrow keys to move through detected entities.

## Future Improvements

- OCR for scanned documents.
- Confirm/reject workflow for each detected entity.
- Downloadable redacted PDF export.
- Stronger browser-compatible NER for names.
- Per-page entity density indicators in the thumbnail rail.

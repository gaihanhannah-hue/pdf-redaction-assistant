import type { PDFDocumentProxy } from 'pdfjs-dist'

export type EntityType = 'date' | 'name' | 'search'

export type HighlightBox = {
  x: number
  y: number
  width: number
  height: number
}

export type Entity = {
  id: string
  type: EntityType
  text: string
  pageIndex: number
  bbox: HighlightBox
  rule: string
}

export type TextBox = {
  id: string
  pageIndex: number
  text: string
  bbox: HighlightBox
}

export type PageModel = {
  pageIndex: number
  width: number
  height: number
  textBoxes: TextBox[]
}

export type LoadedPdf = {
  fileName: string
  document: PDFDocumentProxy
  pages: PageModel[]
  thumbnails: string[]
  sourceBytes: Uint8Array
}


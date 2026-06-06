import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  TextItem,
  TextMarkedContent,
} from 'pdfjs-dist/types/src/display/api'
import type { LoadedPdf, PageModel, TextBox } from '../types'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export const VIEWER_SCALE = 1.35
const THUMBNAIL_SCALE = 0.22
let renderSequence = 0
const renderTokens = new WeakMap<HTMLCanvasElement, number>()
const activeRenderTasks = new WeakMap<HTMLCanvasElement, ReturnType<PDFPageProxy['render']>>()

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return 'str' in item
}

function getTextBox(item: TextItem, pageIndex: number, itemIndex: number, viewport: pdfjsLib.PageViewport): TextBox | null {
  const text = item.str.replace(/\s+/g, ' ').trim()

  if (!text) {
    return null
  }

  const transformed = pdfjsLib.Util.transform(viewport.transform, item.transform)
  const fontHeight = Math.hypot(transformed[2], transformed[3])
  const width = Math.max(item.width * viewport.scale, 4)
  const height = Math.max(fontHeight, item.height * viewport.scale, 10)

  return {
    id: `p${pageIndex + 1}-t${itemIndex}`,
    pageIndex,
    text,
    bbox: {
      x: transformed[4],
      y: transformed[5] - height,
      width,
      height,
    },
  }
}

async function renderThumbnail(page: PDFPageProxy) {
  const viewport = page.getViewport({ scale: THUMBNAIL_SCALE })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    return ''
  }

  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)

  await page.render({ canvas, canvasContext: context, viewport }).promise
  return canvas.toDataURL('image/png')
}

async function extractPageModel(page: PDFPageProxy, pageIndex: number): Promise<PageModel> {
  const viewport = page.getViewport({ scale: VIEWER_SCALE })
  const textContent = await page.getTextContent()
  const textBoxes = textContent.items
    .map((item, itemIndex) => (isTextItem(item) ? getTextBox(item, pageIndex, itemIndex, viewport) : null))
    .filter((item): item is TextBox => item !== null)

  return {
    pageIndex,
    width: viewport.width,
    height: viewport.height,
    textBoxes,
  }
}

export async function loadPdfFromFile(file: File): Promise<LoadedPdf> {
  const buffer = await file.arrayBuffer()
  const sourceBytes = new Uint8Array(buffer.slice(0))
  const document = await pdfjsLib.getDocument({ data: buffer }).promise
  const pages: PageModel[] = []
  const thumbnails: string[] = []

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    pages.push(await extractPageModel(page, pageNumber - 1))
    thumbnails.push(await renderThumbnail(page))
  }

  return {
    fileName: file.name,
    document,
    pages,
    thumbnails,
    sourceBytes,
  }
}

export async function renderPageToCanvas(
  document: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
) {
  const token = renderSequence + 1
  renderSequence = token
  renderTokens.set(canvas, token)
  activeRenderTasks.get(canvas)?.cancel()

  const page = await document.getPage(pageIndex + 1)

  if (renderTokens.get(canvas) !== token) {
    return
  }

  const viewport = page.getViewport({ scale: VIEWER_SCALE })
  const context = canvas.getContext('2d')

  if (!context) {
    return
  }

  const outputScale = window.devicePixelRatio || 1
  canvas.width = Math.floor(viewport.width * outputScale)
  canvas.height = Math.floor(viewport.height * outputScale)
  canvas.style.width = `${viewport.width}px`
  canvas.style.height = `${viewport.height}px`

  const renderTask = page.render({
    canvas,
    canvasContext: context,
    viewport,
    transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
  })

  activeRenderTasks.set(canvas, renderTask)

  try {
    await renderTask.promise
  } catch (error) {
    if ((error as Error).name !== 'RenderingCancelledException') {
      throw error
    }
  } finally {
    if (activeRenderTasks.get(canvas) === renderTask) {
      activeRenderTasks.delete(canvas)
    }
  }
}

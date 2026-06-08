import { PDFDocument, rgb } from 'pdf-lib'
import type { Entity, PageModel } from '../types'

type ExportRedactionArgs = {
  sourceBytes: Uint8Array
  pages: PageModel[]
  redactions: Entity[]
  fileName: string
}

function groupByPage(redactions: Entity[]) {
  const grouped = new Map<number, Entity[]>()

  for (const entity of redactions) {
    const bucket = grouped.get(entity.pageIndex) ?? []
    bucket.push(entity)
    grouped.set(entity.pageIndex, bucket)
  }

  return grouped
}

function bytesToPdfBlob(bytes: Uint8Array) {
  const outputBuffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(outputBuffer).set(bytes)
  return new Blob([outputBuffer], { type: 'application/pdf' })
}

export function downloadPdfBytes(bytes: Uint8Array, fileName: string) {
  const blob = bytesToPdfBlob(bytes)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()

  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function createPdfObjectUrl(bytes: Uint8Array) {
  return URL.createObjectURL(bytesToPdfBlob(bytes))
}

export async function createRedactedPdfBytes({
  sourceBytes,
  pages,
  redactions,
}: Omit<ExportRedactionArgs, 'fileName'>) {
  const pdfDoc = await PDFDocument.load(sourceBytes)
  const pdfPages = pdfDoc.getPages()
  const grouped = groupByPage(redactions)

  for (const [pageIndex, entities] of grouped.entries()) {
    const pageModel = pages[pageIndex]
    const pdfPage = pdfPages[pageIndex]

    if (!pageModel || !pdfPage) {
      continue
    }

    const scaleX = pdfPage.getWidth() / pageModel.width
    const scaleY = pdfPage.getHeight() / pageModel.height

    for (const entity of entities) {
      const bbox = entity.bbox
      const x = bbox.x * scaleX
      const y = pdfPage.getHeight() - (bbox.y + bbox.height) * scaleY
      const width = bbox.width * scaleX
      const height = bbox.height * scaleY

      pdfPage.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(0, 0, 0),
      })
    }
  }

  return pdfDoc.save()
}

export async function exportRedactedPdf({
  sourceBytes,
  pages,
  redactions,
  fileName,
}: ExportRedactionArgs) {
  const bytes = await createRedactedPdfBytes({ sourceBytes, pages, redactions })
  const safeName = fileName.replace(/\.pdf$/i, '') || 'document'

  downloadPdfBytes(bytes, `${safeName}-redacted.pdf`)
}

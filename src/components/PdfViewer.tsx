import { useEffect, useMemo, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { Entity, PageModel } from '../types'
import { renderPageToCanvas } from '../lib/pdf'

type PdfViewerProps = {
  document: PDFDocumentProxy | null
  pages: PageModel[]
  activePage: number
  visibleEntities: Entity[]
  redactions: Entity[]
  selectedEntityIds: Set<string>
  onVisiblePageChange: (pageIndex: number) => void
  onEntityToggle: (entityId: string) => void
}

type PageCanvasProps = {
  document: PDFDocumentProxy
  page: PageModel
  highlights: Entity[]
  redactions: Entity[]
  selectedEntityIds: Set<string>
  onEntityToggle: (entityId: string) => void
}

function PageCanvas({
  document,
  page,
  highlights,
  redactions,
  selectedEntityIds,
  onEntityToggle,
}: PageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    renderPageToCanvas(document, page.pageIndex, canvas)
  }, [document, page.pageIndex])

  return (
    <article
      className="pdf-page"
      data-page-index={page.pageIndex}
      style={{ width: page.width, height: page.height }}
    >
      <canvas ref={canvasRef} aria-label={`Rendered PDF page ${page.pageIndex + 1}`} />
      <div className="highlight-layer" aria-hidden="true">
        {highlights.map((entity) => (
          <button
            className={[
              'highlight-box',
              entity.type,
              selectedEntityIds.has(entity.id) ? 'selected' : '',
            ].join(' ')}
            key={entity.id}
            onClick={() => onEntityToggle(entity.id)}
            style={{
              left: entity.bbox.x,
              top: entity.bbox.y,
              width: entity.bbox.width,
              height: entity.bbox.height,
            }}
            title={`${entity.text} (${entity.rule})`}
            type="button"
          />
        ))}
      </div>
      <div className="redaction-layer" aria-hidden="true">
        {redactions.map((entity) => (
          <div
            className="redaction-box"
            key={entity.id}
            style={{
              left: entity.bbox.x,
              top: entity.bbox.y,
              width: entity.bbox.width,
              height: entity.bbox.height,
            }}
          />
        ))}
      </div>
    </article>
  )
}

export function PdfViewer({
  document,
  pages,
  activePage,
  visibleEntities,
  redactions,
  selectedEntityIds,
  onVisiblePageChange,
  onEntityToggle,
}: PdfViewerProps) {
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const isManualScrollingRef = useRef(false)
  const highlightsByPage = useMemo(() => {
    const grouped = new Map<number, Entity[]>()

    for (const entity of visibleEntities) {
      const pageHighlights = grouped.get(entity.pageIndex) ?? []
      pageHighlights.push(entity)
      grouped.set(entity.pageIndex, pageHighlights)
    }

    return grouped
  }, [visibleEntities])

  const redactionsByPage = useMemo(() => {
    const grouped = new Map<number, Entity[]>()

    for (const entity of redactions) {
      const pageRedactions = grouped.get(entity.pageIndex) ?? []
      pageRedactions.push(entity)
      grouped.set(entity.pageIndex, pageRedactions)
    }

    return grouped
  }, [redactions])

  useEffect(() => {
    const viewer = viewerRef.current
    const target = viewer?.querySelector<HTMLElement>(`[data-page-index="${activePage}"]`)

    if (!target) {
      return
    }

    isManualScrollingRef.current = true
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })

    const timeout = setTimeout(() => {
      isManualScrollingRef.current = false
    }, 600)

    return () => clearTimeout(timeout)
  }, [activePage])

  useEffect(() => {
    const viewer = viewerRef.current

    if (!viewer) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrollingRef.current) {
          return
        }

        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        const pageIndex = Number(visibleEntry?.target.getAttribute('data-page-index'))

        if (Number.isInteger(pageIndex)) {
          onVisiblePageChange(pageIndex)
        }
      },
      { root: viewer, threshold: [0.35, 0.55, 0.75] },
    )

    viewer.querySelectorAll('[data-page-index]').forEach((page) => observer.observe(page))
    return () => observer.disconnect()
  }, [pages, onVisiblePageChange])

  return (
    <main className="viewer-shell" aria-label="PDF viewer">
      <div className="viewer-toolbar">
        <span>{document ? `${pages.length} pages` : 'Waiting for PDF'}</span>
        <span>Yellow dates · Blue names · Green search</span>
      </div>

      <div className="pdf-scroll" ref={viewerRef}>
        {!document ? (
          <div className="viewer-empty">
            <strong>Ready for review</strong>
            <span>The uploaded PDF will render page-by-page in this workspace.</span>
          </div>
        ) : (
          pages.map((page) => (
            <PageCanvas
              document={document}
              highlights={highlightsByPage.get(page.pageIndex) ?? []}
              key={page.pageIndex}
              onEntityToggle={onEntityToggle}
              page={page}
              redactions={redactionsByPage.get(page.pageIndex) ?? []}
              selectedEntityIds={selectedEntityIds}
            />
          ))
        )}
      </div>
    </main>
  )
}


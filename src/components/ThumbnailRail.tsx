import { FileText, Grid2X2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Entity, PageModel } from '../types'

type ThumbnailRailProps = {
  thumbnails: string[]
  activePage: number
  pages: PageModel[]
  highlights: Entity[]
  redactions: Entity[]
  onPageSelect: (pageIndex: number) => void
}

export function ThumbnailRail({
  thumbnails,
  activePage,
  pages,
  highlights,
  redactions,
  onPageSelect,
}: ThumbnailRailProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const [isOverviewOpen, setIsOverviewOpen] = useState(false)

  const highlightsByPage = useMemo(() => groupEntitiesByPage(highlights), [highlights])
  const redactionsByPage = useMemo(() => groupEntitiesByPage(redactions), [redactions])

  useEffect(() => {
    const container = listRef.current
    const target = container?.querySelector<HTMLElement>(`[data-page-index="${activePage}"]`)

    target?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activePage])

  const selectPage = (pageIndex: number) => {
    onPageSelect(pageIndex)
    setIsOverviewOpen(false)
  }

  return (
    <aside className="thumbnail-rail" aria-label="Page thumbnails">
      <div className="panel-heading">
        <FileText size={18} />
        <span>Pages</span>
        <button
          aria-label="Open page overview"
          className="overview-toggle"
          disabled={thumbnails.length === 0}
          onClick={() => setIsOverviewOpen(true)}
          title="Page overview"
          type="button"
        >
          <Grid2X2 size={17} />
        </button>
      </div>

      <div className="thumbnail-list" ref={listRef}>
        {thumbnails.length === 0 ? (
          <div className="rail-empty">Upload a PDF to preview pages.</div>
        ) : (
          thumbnails.map((thumbnail, index) => (
            <button
              className={`thumbnail-button ${activePage === index ? 'active' : ''}`}
              data-page-index={index}
              key={`${thumbnail}-${index}`}
              onClick={() => onPageSelect(index)}
              type="button"
            >
              <PagePreview
                active={activePage === index}
                alt={`Page ${index + 1} thumbnail`}
                highlights={highlightsByPage.get(index) ?? []}
                page={pages[index]}
                redactions={redactionsByPage.get(index) ?? []}
                src={thumbnail}
              />
              <span>{index + 1}</span>
            </button>
          ))
        )}
      </div>

      {isOverviewOpen ? (
        <div
          aria-label="All PDF pages"
          aria-modal="true"
          className="page-overview-backdrop"
          role="dialog"
        >
          <div className="page-overview">
            <div className="page-overview-header">
              <strong>All pages</strong>
              <span>{thumbnails.length} pages</span>
              <button
                aria-label="Close page overview"
                className="overview-close"
                onClick={() => setIsOverviewOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="page-overview-grid">
              {thumbnails.map((thumbnail, index) => (
                <button
                  className={`overview-page ${activePage === index ? 'active' : ''}`}
                  key={`overview-${thumbnail}-${index}`}
                  onClick={() => selectPage(index)}
                  type="button"
                >
                  <PagePreview
                    active={activePage === index}
                    alt={`Page ${index + 1} overview`}
                    highlights={highlightsByPage.get(index) ?? []}
                    page={pages[index]}
                    redactions={redactionsByPage.get(index) ?? []}
                    src={thumbnail}
                  />
                  <span>Page {index + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  )
}

function groupEntitiesByPage(entities: Entity[]) {
  const grouped = new Map<number, Entity[]>()

  for (const entity of entities) {
    const pageEntities = grouped.get(entity.pageIndex) ?? []
    pageEntities.push(entity)
    grouped.set(entity.pageIndex, pageEntities)
  }

  return grouped
}

function PagePreview({
  active,
  alt,
  highlights,
  page,
  redactions,
  src,
}: {
  active: boolean
  alt: string
  highlights: Entity[]
  page?: PageModel
  redactions: Entity[]
  src: string
}) {
  return (
    <span className={`thumbnail-preview ${active ? 'active' : ''}`}>
      <img src={src} alt={alt} />
      {page ? (
        <span className="thumbnail-mark-layer" aria-hidden="true">
          {highlights.map((entity) => (
            <span
              className={`thumbnail-mark highlight ${entity.type}`}
              key={`highlight-${entity.id}`}
              style={getPreviewBoxStyle(entity, page)}
            />
          ))}
          {redactions.map((entity) => (
            <span
              className="thumbnail-mark redaction"
              key={`redaction-${entity.id}`}
              style={getPreviewBoxStyle(entity, page)}
            />
          ))}
        </span>
      ) : null}
    </span>
  )
}

function getPreviewBoxStyle(entity: Entity, page: PageModel) {
  return {
    left: `${(entity.bbox.x / page.width) * 100}%`,
    top: `${(entity.bbox.y / page.height) * 100}%`,
    width: `${(entity.bbox.width / page.width) * 100}%`,
    height: `${(entity.bbox.height / page.height) * 100}%`,
  }
}

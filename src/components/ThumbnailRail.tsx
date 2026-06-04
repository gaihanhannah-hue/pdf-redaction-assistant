import { FileText } from 'lucide-react'

type ThumbnailRailProps = {
  thumbnails: string[]
  activePage: number
  onPageSelect: (pageIndex: number) => void
}

export function ThumbnailRail({ thumbnails, activePage, onPageSelect }: ThumbnailRailProps) {
  return (
    <aside className="thumbnail-rail" aria-label="Page thumbnails">
      <div className="panel-heading">
        <FileText size={18} />
        <span>Pages</span>
      </div>

      <div className="thumbnail-list">
        {thumbnails.length === 0 ? (
          <div className="rail-empty">Upload a PDF to preview pages.</div>
        ) : (
          thumbnails.map((thumbnail, index) => (
            <button
              className={`thumbnail-button ${activePage === index ? 'active' : ''}`}
              key={`${thumbnail}-${index}`}
              onClick={() => onPageSelect(index)}
              type="button"
            >
              <img src={thumbnail} alt={`Page ${index + 1} thumbnail`} />
              <span>Page {index + 1}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  )
}


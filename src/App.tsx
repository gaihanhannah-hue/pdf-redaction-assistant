import { useCallback, useEffect, useMemo, useState } from 'react'
import { EntityPanel } from './components/EntityPanel'
import { PdfViewer } from './components/PdfViewer'
import { ThumbnailRail } from './components/ThumbnailRail'
import { UploadPanel } from './components/UploadPanel'
import { extractEntities, extractSearchEntities } from './lib/entityExtraction'
import { loadPdfFromFile } from './lib/pdf'
import type { Entity, LoadedPdf } from './types'
import './App.css'

function App() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set())
  const [activePage, setActivePage] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allTextBoxes = useMemo(
    () => loadedPdf?.pages.flatMap((page) => page.textBoxes) ?? [],
    [loadedPdf],
  )

  const searchEntities = useMemo(
    () => extractSearchEntities(allTextBoxes, searchTerm),
    [allTextBoxes, searchTerm],
  )

  const reviewQueue = useMemo(
    () => entities.filter((entity) => selectedEntityIds.has(entity.id)),
    [entities, selectedEntityIds],
  )

  const visibleEntities = useMemo(() => {
    const selectedDetected = entities.filter((entity) => selectedEntityIds.has(entity.id))
    return [...selectedDetected, ...searchEntities]
  }, [entities, selectedEntityIds, searchEntities])

  const handleFileSelected = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const pdf = await loadPdfFromFile(file)
      const detectedEntities = extractEntities(pdf.pages.flatMap((page) => page.textBoxes))

      setLoadedPdf(pdf)
      setEntities(detectedEntities)
      setSelectedEntityIds(new Set(detectedEntities.slice(0, 3).map((entity) => entity.id)))
      setActivePage(0)
      setSearchTerm('')
    } catch (loadError) {
      console.error(loadError)
      setError('The PDF could not be read. Try another file.')
      setLoadedPdf(null)
      setEntities([])
      setSelectedEntityIds(new Set())
    } finally {
      setIsLoading(false)
    }
  }, [])

  const toggleEntity = useCallback((entityId: string) => {
    setSelectedEntityIds((current) => {
      const next = new Set(current)

      if (next.has(entityId)) {
        next.delete(entityId)
      } else {
        next.add(entityId)
      }

      return next
    })
  }, [])

  const selectEntity = useCallback(
    (entity: Entity) => {
      setActivePage(entity.pageIndex)
      toggleEntity(entity.id)
    },
    [toggleEntity],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key) || entities.length === 0) {
        return
      }

      const activeIndex = entities.findIndex((entity) => selectedEntityIds.has(entity.id))
      const direction = event.key === 'ArrowDown' ? 1 : -1
      const nextIndex =
        activeIndex === -1
          ? 0
          : (activeIndex + direction + entities.length) % entities.length
      const nextEntity = entities[nextIndex]

      event.preventDefault()
      setSelectedEntityIds(new Set([nextEntity.id]))
      setActivePage(nextEntity.pageIndex)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [entities, selectedEntityIds])

  return (
    <div className="app-shell">
      <header className="topbar">
        <UploadPanel
          error={error}
          fileName={loadedPdf?.fileName ?? null}
          isLoading={isLoading}
          onFileSelected={handleFileSelected}
        />
      </header>

      <div className="workspace-grid">
        <ThumbnailRail
          activePage={activePage}
          onPageSelect={setActivePage}
          thumbnails={loadedPdf?.thumbnails ?? []}
        />
        <PdfViewer
          activePage={activePage}
          document={loadedPdf?.document ?? null}
          onEntityToggle={toggleEntity}
          onVisiblePageChange={setActivePage}
          pages={loadedPdf?.pages ?? []}
          selectedEntityIds={selectedEntityIds}
          visibleEntities={visibleEntities}
        />
        <EntityPanel
          entities={entities}
          onEntitySelect={selectEntity}
          onEntityToggle={toggleEntity}
          onSearchTermChange={setSearchTerm}
          reviewQueue={reviewQueue}
          searchTerm={searchTerm}
          selectedEntityIds={selectedEntityIds}
        />
      </div>
    </div>
  )
}

export default App


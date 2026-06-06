import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { EntityPanel } from './components/EntityPanel'
import { PdfViewer } from './components/PdfViewer'
import { ThumbnailRail } from './components/ThumbnailRail'
import { UploadPanel } from './components/UploadPanel'
import { extractEntities, extractSearchEntities } from './lib/entityExtraction'
import { loadPdfFromFile } from './lib/pdf'
import { exportRedactedPdf } from './lib/redaction'
import type { Entity, LoadedPdf } from './types'
import './App.css'

function App() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set())
  const [redactedEntityIds, setRedactedEntityIds] = useState<Set<string>>(new Set())
  const [activePage, setActivePage] = useState(0)
  const [leftWidth, setLeftWidth] = useState(168)
  const [rightWidth, setRightWidth] = useState(346)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resizeState = useRef<{
    side: 'left' | 'right'
    startX: number
    startLeft: number
    startRight: number
  } | null>(null)

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

  const redactionQueue = useMemo(
    () => entities.filter((entity) => redactedEntityIds.has(entity.id)),
    [entities, redactedEntityIds],
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
      const firstDate = detectedEntities.find((e) => e.type === 'date')
      const firstName = detectedEntities.find((e) => e.type === 'name')
      const defaults = [firstDate, firstName].filter(Boolean) as Entity[]
      setSelectedEntityIds(new Set(defaults.map((entity) => entity.id)))
      setRedactedEntityIds(new Set())
      setActivePage(0)
      setSearchTerm('')
    } catch (loadError) {
      console.error(loadError)
      setError('The PDF could not be read. Try another file.')
      setLoadedPdf(null)
      setEntities([])
      setSelectedEntityIds(new Set())
      setRedactedEntityIds(new Set())
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
      setSelectedEntityIds((current) => {
        const next = new Set(current)
        if (next.has(entity.id)) {
          next.delete(entity.id)
        } else {
          next.add(entity.id)
        }
        return next
      })
    },
    [],
  )

  const toggleRedaction = useCallback((entityId: string, pageIndex: number) => {
    setActivePage(pageIndex)
    setRedactedEntityIds((current) => {
      const next = new Set(current)

      if (next.has(entityId)) {
        next.delete(entityId)
      } else {
        next.add(entityId)
      }

      return next
    })
  }, [])

  const clearRedactions = useCallback(() => {
    setRedactedEntityIds(new Set())
  }, [])

  const selectAllByType = useCallback(
    (type: 'date' | 'name') => {
      setSelectedEntityIds((current) => {
        const next = new Set(current)
        for (const entity of entities) {
          if (entity.type === type) {
            next.add(entity.id)
          }
        }
        return next
      })
    },
    [entities],
  )

  const deselectAllByType = useCallback(
    (type: 'date' | 'name') => {
      setSelectedEntityIds((current) => {
        const next = new Set(current)
        for (const entity of entities) {
          if (entity.type === type) {
            next.delete(entity.id)
          }
        }
        return next
      })
    },
    [entities],
  )

  const selectEntityIds = useCallback((ids: string[]) => {
    setSelectedEntityIds((current) => {
      const next = new Set(current)
      for (const id of ids) {
        next.add(id)
      }
      return next
    })
  }, [])

  const deselectEntityIds = useCallback((ids: string[]) => {
    setSelectedEntityIds((current) => {
      const next = new Set(current)
      for (const id of ids) {
        next.delete(id)
      }
      return next
    })
  }, [])

  const navigateToPage = useCallback((pageIndex: number) => {
    setActivePage(pageIndex)
  }, [])

  const handlePrint = useCallback(() => {
    if (!loadedPdf) return
    const sourceBuffer = new ArrayBuffer(loadedPdf.sourceBytes.byteLength)
    new Uint8Array(sourceBuffer).set(loadedPdf.sourceBytes)
    const blob = new Blob([sourceBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      })
    }
  }, [loadedPdf])

  const handleExportRedactions = useCallback(async () => {
    if (!loadedPdf || redactionQueue.length === 0) {
      return
    }

    setIsExporting(true)

    try {
      await exportRedactedPdf({
        sourceBytes: loadedPdf.sourceBytes,
        pages: loadedPdf.pages,
        redactions: redactionQueue,
        fileName: loadedPdf.fileName,
      })
    } catch (exportError) {
      console.error(exportError)
      setError('Failed to export the redacted PDF.')
    } finally {
      setIsExporting(false)
    }
  }, [loadedPdf, redactionQueue])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--left-rail-width', `${leftWidth}px`)
    root.style.setProperty('--right-panel-width', `${rightWidth}px`)
  }, [leftWidth, rightWidth])

  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const state = resizeState.current

      if (!state) {
        return
      }

      const delta = event.clientX - state.startX

      if (state.side === 'left') {
        const nextLeft = Math.min(Math.max(state.startLeft + delta, 140), 320)
        setLeftWidth(nextLeft)
      } else {
        const nextRight = Math.min(Math.max(state.startRight - delta, 260), 520)
        setRightWidth(nextRight)
      }
    }

    const handlePointerUp = () => {
      if (!resizeState.current) {
        return
      }

      resizeState.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  const startResize = useCallback(
    (side: 'left' | 'right') => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      resizeState.current = {
        side,
        startX: event.clientX,
        startLeft: leftWidth,
        startRight: rightWidth,
      }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [leftWidth, rightWidth],
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
          hasDocument={loadedPdf !== null}
          isLoading={isLoading}
          onFileSelected={handleFileSelected}
          onPrint={handlePrint}
        />
      </header>

      <div className="workspace-grid">
        <ThumbnailRail
          activePage={activePage}
          onPageSelect={setActivePage}
          thumbnails={loadedPdf?.thumbnails ?? []}
        />
        <div
          aria-label="Resize left panel"
          aria-orientation="vertical"
          className="column-resizer"
          onPointerDown={startResize('left')}
          role="separator"
        />
        <PdfViewer
          activePage={activePage}
          document={loadedPdf?.document ?? null}
          onEntityToggle={toggleEntity}
          onVisiblePageChange={setActivePage}
          pages={loadedPdf?.pages ?? []}
          redactions={redactionQueue}
          selectedEntityIds={selectedEntityIds}
          visibleEntities={visibleEntities}
        />
        <div
          aria-label="Resize right panel"
          aria-orientation="vertical"
          className="column-resizer"
          onPointerDown={startResize('right')}
          role="separator"
        />
        <EntityPanel
          entities={entities}
          onDeselectAllByType={deselectAllByType}
          onDeselectEntityIds={deselectEntityIds}
          onEntitySelect={selectEntity}
          onExportRedactions={handleExportRedactions}
          onRedactionToggle={toggleRedaction}
          onRedactionsClear={clearRedactions}
          onSearchTermChange={setSearchTerm}
          onSelectAllByType={selectAllByType}
          onNavigateToPage={navigateToPage}
          onSelectEntityIds={selectEntityIds}
          redactionQueue={redactionQueue}
          reviewQueue={reviewQueue}
          searchTerm={searchTerm}
          isExporting={isExporting}
          redactedEntityIds={redactedEntityIds}
          selectedEntityIds={selectedEntityIds}
        />
      </div>
    </div>
  )
}

export default App

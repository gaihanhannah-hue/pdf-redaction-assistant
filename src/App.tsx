import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { EntityPanel } from './components/EntityPanel'
import { PdfViewer } from './components/PdfViewer'
import { ThumbnailRail } from './components/ThumbnailRail'
import { UploadPanel } from './components/UploadPanel'
import { extractEntities, extractSearchEntities } from './lib/entityExtraction'
import { loadPdfFromBytes, loadPdfFromFile } from './lib/pdf'
import {
  createPdfObjectUrl,
  createRedactedPdfBytes,
  exportRedactedPdf,
} from './lib/redaction'
import {
  base64ToBytes,
  bytesToBase64,
  listReviewDrafts,
  loadReviewDraft,
  saveReviewDraft,
  type ReviewDraftSummary,
} from './lib/session'
import type { Entity, LoadedPdf } from './types'
import './App.css'

function App() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set())
  const [redactedEntityIds, setRedactedEntityIds] = useState<Set<string>>(new Set())
  const [activePage, setActivePage] = useState(0)
  const [leftWidth, setLeftWidth] = useState(136)
  const [rightWidth, setRightWidth] = useState(346)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDocumentActionRunning, setIsDocumentActionRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<ReviewDraftSummary[]>(() => listReviewDrafts())
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

  const applyLoadedPdf = useCallback(
    (
      pdf: LoadedPdf,
      options?: {
        selectedEntityIds?: string[]
        redactedEntityIds?: string[]
        activePage?: number
        searchTerm?: string
      },
    ) => {
      const detectedEntities = extractEntities(pdf.pages.flatMap((page) => page.textBoxes))
      const validEntityIds = new Set(detectedEntities.map((entity) => entity.id))

      setLoadedPdf(pdf)
      setEntities(detectedEntities)

      if (options?.selectedEntityIds) {
        setSelectedEntityIds(
          new Set(options.selectedEntityIds.filter((id) => validEntityIds.has(id))),
        )
      } else {
        const firstDate = detectedEntities.find((e) => e.type === 'date')
        const firstName = detectedEntities.find((e) => e.type === 'name')
        const firstPhone = detectedEntities.find((e) => e.type === 'phone')
        const defaults = [firstDate, firstName, firstPhone].filter(Boolean) as Entity[]
        setSelectedEntityIds(new Set(defaults.map((entity) => entity.id)))
      }

      setRedactedEntityIds(
        new Set((options?.redactedEntityIds ?? []).filter((id) => validEntityIds.has(id))),
      )
      setActivePage(options?.activePage ?? 0)
      setSearchTerm(options?.searchTerm ?? '')
    },
    [],
  )

  const handleFileSelected = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const pdf = await loadPdfFromFile(file)
      applyLoadedPdf(pdf)
      setSessionMessage('New unsaved draft.')
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
  }, [applyLoadedPdf])

  const handleNewSession = useCallback(() => {
    setLoadedPdf(null)
    setEntities([])
    setSelectedEntityIds(new Set())
    setRedactedEntityIds(new Set())
    setActivePage(0)
    setSearchTerm('')
    setError(null)
    setSessionMessage('Started a new session.')
  }, [])

  const handleLoadDraft = useCallback(
    async (draftId: string) => {
      const draft = loadReviewDraft(draftId)

      if (!draft) {
        setError('The selected draft could not be found.')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const pdf = await loadPdfFromBytes(draft.fileName, base64ToBytes(draft.sourceBytesBase64))
        applyLoadedPdf(pdf, {
          selectedEntityIds: draft.selectedEntityIds,
          redactedEntityIds: draft.redactedEntityIds,
          activePage: draft.activePage,
          searchTerm: draft.searchTerm,
        })
        setSessionMessage(`Loaded draft saved at ${new Date(draft.savedAt).toLocaleString()}.`)
      } catch (draftError) {
        console.error(draftError)
        setError('Failed to load the selected draft.')
      } finally {
        setIsLoading(false)
      }
    },
    [applyLoadedPdf],
  )

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
    (type: Exclude<Entity['type'], 'search'>) => {
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
    (type: Exclude<Entity['type'], 'search'>) => {
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

  const getCurrentPdfBytes = useCallback(async () => {
    if (!loadedPdf) {
      return null
    }

    if (redactionQueue.length === 0) {
      return loadedPdf.sourceBytes
    }

    return createRedactedPdfBytes({
      sourceBytes: loadedPdf.sourceBytes,
      pages: loadedPdf.pages,
      redactions: redactionQueue,
    })
  }, [loadedPdf, redactionQueue])

  const handleSaveSession = useCallback(() => {
    if (!loadedPdf) return

    setIsDocumentActionRunning(true)

    try {
      const savedAt = new Date().toISOString()
      saveReviewDraft({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: loadedPdf.fileName,
        sourceBytesBase64: bytesToBase64(loadedPdf.sourceBytes),
        selectedEntityIds: [...selectedEntityIds],
        redactedEntityIds: [...redactedEntityIds],
        activePage,
        searchTerm,
        savedAt,
      })
      setDrafts(listReviewDrafts())
      setSessionMessage(`Saved draft at ${new Date(savedAt).toLocaleString()}.`)
    } catch (saveError) {
      console.error(saveError)
      setError('Failed to save the draft. The PDF may be too large for browser storage.')
    } finally {
      setIsDocumentActionRunning(false)
    }
  }, [activePage, loadedPdf, redactedEntityIds, searchTerm, selectedEntityIds])

  const handlePrint = useCallback(async () => {
    if (!loadedPdf) return

    const printWindow = window.open('about:blank', '_blank')
    if (!printWindow) {
      setError('The print window was blocked by the browser.')
      return
    }

    setIsDocumentActionRunning(true)

    try {
      const bytes = await getCurrentPdfBytes()

      if (!bytes) {
        return
      }

      const url = createPdfObjectUrl(bytes)
      printWindow.location.href = url
      printWindow.addEventListener('load', () => {
        printWindow.print()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      })
    } catch (printError) {
      console.error(printError)
      printWindow.close()
      setError('Failed to prepare the PDF for printing.')
    } finally {
      setIsDocumentActionRunning(false)
    }
  }, [getCurrentPdfBytes, loadedPdf])

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
        const nextLeft = Math.min(Math.max(state.startLeft + delta, 112), 260)
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
          hasRedactions={redactionQueue.length > 0}
          isDocumentActionRunning={isDocumentActionRunning}
          isLoading={isLoading}
          onFileSelected={handleFileSelected}
          onLoadDraft={handleLoadDraft}
          onNewSession={handleNewSession}
          onPrint={handlePrint}
          onSaveSession={handleSaveSession}
          drafts={drafts}
          sessionMessage={sessionMessage}
        />
      </header>

      <div className="workspace-grid">
        <ThumbnailRail
          activePage={activePage}
          highlights={visibleEntities}
          onPageSelect={setActivePage}
          pages={loadedPdf?.pages ?? []}
          redactions={redactionQueue}
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

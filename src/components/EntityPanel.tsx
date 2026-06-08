import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { Entity } from '../types'

type PanelSection = 'dates' | 'names' | 'phones' | 'review' | 'redactions'

type EntityGroup = {
  text: string
  items: Entity[]
  firstEntity: Entity
}

function compareEntitiesByDocumentOrder(a: Entity, b: Entity) {
  if (a.pageIndex !== b.pageIndex) {
    return a.pageIndex - b.pageIndex
  }

  return a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x
}

type EntityPanelProps = {
  entities: Entity[]
  selectedEntityIds: Set<string>
  redactedEntityIds: Set<string>
  reviewQueue: Entity[]
  redactionQueue: Entity[]
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onEntitySelect: (entity: Entity) => void
  onRedactionToggle: (entityId: string, pageIndex: number) => void
  onSelectAllByType: (type: Exclude<Entity['type'], 'search'>) => void
  onDeselectAllByType: (type: Exclude<Entity['type'], 'search'>) => void
  onNavigateToPage: (pageIndex: number) => void
  onSelectEntityIds: (ids: string[]) => void
  onDeselectEntityIds: (ids: string[]) => void
  onExportRedactions: () => void
  onRedactionsClear: () => void
  isExporting: boolean
}

/* ------------------------------------------------------------------ */
/*  GroupedEntityRow                                                  */
/* ------------------------------------------------------------------ */

function GroupedEntityRow({
  group,
  isExpanded,
  onToggleExpand,
  selectedEntityIds,
  redactedEntityIds,
  onEntitySelect,
  onRedactionToggle,
  onSelectEntityIds,
  onDeselectEntityIds,
  onNavigateToPage,
}: {
  group: EntityGroup
  isExpanded: boolean
  onToggleExpand: () => void
  selectedEntityIds: Set<string>
  redactedEntityIds: Set<string>
  onEntitySelect: (entity: Entity) => void
  onRedactionToggle: (entityId: string, pageIndex: number) => void
  onSelectEntityIds: (ids: string[]) => void
  onDeselectEntityIds: (ids: string[]) => void
  onNavigateToPage: (pageIndex: number) => void
}) {
  const { text, items } = group
  const isSingle = items.length === 1
  const allIds = items.map((e) => e.id)
  const allSelected = allIds.every((id) => selectedEntityIds.has(id))

  const sorted = [...items].sort(compareEntitiesByDocumentOrder)

  const handleGroupCheck = () => {
    if (allSelected) {
      onDeselectEntityIds(allIds)
    } else {
      onSelectEntityIds(allIds)
      onNavigateToPage(sorted[0].pageIndex)
    }
  }

  if (isSingle) {
    const entity = items[0]
    const selected = selectedEntityIds.has(entity.id)
    const redacted = redactedEntityIds.has(entity.id)

    return (
      <div className={`entity-row ${entity.type} ${selected ? 'selected' : ''}`}>
        <input
          aria-label={`Toggle ${entity.text}`}
          checked={selected}
          className="entity-check"
          onChange={() => onEntitySelect(entity)}
          onClick={(event) => event.stopPropagation()}
          type="checkbox"
        />
        <div
          className="entity-main"
          onClick={() => onEntitySelect(entity)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onEntitySelect(entity)
            }
          }}
          role="button"
          tabIndex={0}
        >
          <span className="entity-text">{entity.text}</span>
          <span className="entity-page">Page {entity.pageIndex + 1}</span>
          <span className="entity-rule">{entity.rule}</span>
        </div>
        <button
          className={`redact-toggle ${redacted ? 'active' : ''}`}
          onClick={(event) => {
            event.stopPropagation()
            onRedactionToggle(entity.id, entity.pageIndex)
          }}
          type="button"
        >
          {redacted ? 'Redacted' : 'Redact'}
        </button>
      </div>
    )
  }

  /* ---- group with multiple items ---- */
  return (
    <div className="entity-group">
      <div className="entity-group-header">
        <input
          aria-label={`Toggle all ${text}`}
          checked={allSelected}
          className="entity-check"
          onChange={handleGroupCheck}
          onClick={(event) => event.stopPropagation()}
          type="checkbox"
        />
        <button
          className="group-expand-toggle"
          onClick={onToggleExpand}
          type="button"
        >
          <span className="group-chevron">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className="entity-text">{text}</span>
          <strong className="group-count">{items.length}</strong>
        </button>
      </div>

      {isExpanded ? (
        <div className="entity-group-items">
          {sorted.map((entity) => {
            const selected = selectedEntityIds.has(entity.id)
            const redacted = redactedEntityIds.has(entity.id)

            return (
              <div
                className={`entity-row nested ${entity.type} ${selected ? 'selected' : ''}`}
                key={entity.id}
              >
                <input
                  aria-label={`Toggle ${entity.text} on page ${entity.pageIndex + 1}`}
                  checked={selected}
                  className="entity-check"
                  onChange={() => {
                    if (selected) {
                      onDeselectEntityIds([entity.id])
                    } else {
                      onSelectEntityIds([entity.id])
                    }
                    onNavigateToPage(entity.pageIndex)
                  }}
                  onClick={(event) => event.stopPropagation()}
                  type="checkbox"
                />
                <div
                  className="entity-main"
                  onClick={() => onEntitySelect(entity)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onEntitySelect(entity)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="entity-page">Page {entity.pageIndex + 1}</span>
                  <span className="entity-rule">{entity.rule}</span>
                </div>
                <button
                  className={`redact-toggle ${redacted ? 'active' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onRedactionToggle(entity.id, entity.pageIndex)
                  }}
                  type="button"
                >
                  {redacted ? 'Redacted' : 'Redact'}
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  EntitySection                                                     */
/* ------------------------------------------------------------------ */

function EntitySection({
  title,
  type,
  entities,
  selectedEntityIds,
  redactedEntityIds,
  onEntitySelect,
  onRedactionToggle,
  onSelectAll,
  onDeselectAll,
  onSelectEntityIds,
  onDeselectEntityIds,
  onNavigateToPage,
  listHeight,
  onResizeStart,
  dragHandleProps,
}: {
  title: string
  type: Exclude<Entity['type'], 'search'>
  entities: Entity[]
  selectedEntityIds: Set<string>
  redactedEntityIds: Set<string>
  onEntitySelect: (entity: Entity) => void
  onRedactionToggle: (entityId: string, pageIndex: number) => void
  onSelectAll?: () => void
  onDeselectAll?: () => void
  onSelectEntityIds: (ids: string[]) => void
  onDeselectEntityIds: (ids: string[]) => void
  onNavigateToPage: (pageIndex: number) => void
  listHeight: number
  onResizeStart: (event: PointerEvent<HTMLDivElement>) => void
  dragHandleProps?: Record<string, unknown>
}) {
  const [expanded, setExpanded] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const map = new Map<string, Entity[]>()
    for (const entity of entities) {
      const key = entity.text.toLowerCase()
      const bucket = map.get(key) ?? []
      bucket.push(entity)
      map.set(key, bucket)
    }
    return (
      Array.from(map.entries())
        // keep original casing from first item
        .map(([, items]) => {
          const sortedItems = [...items].sort(compareEntitiesByDocumentOrder)
          return { text: sortedItems[0].text, items: sortedItems, firstEntity: sortedItems[0] }
        })
        .sort((a, b) => compareEntitiesByDocumentOrder(a.firstEntity, b.firstEntity))
    )
  }, [entities])

  const toggleExpandGroup = useCallback((groupText: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupText)) {
        next.delete(groupText)
      } else {
        next.add(groupText)
      }
      return next
    })
  }, [])

  return (
    <section className={`entity-section themed ${type}`}>
      <button
        className="section-toggle drag-handle"
        {...dragHandleProps}
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span>{title}</span>
        <strong className={type}>{entities.length}</strong>
      </button>

      {expanded ? (
        <>
          <div className="section-actions-bar">
            <button
              className="batch-btn"
              disabled={entities.length === 0}
              onClick={(event) => {
                event.stopPropagation()
                onSelectAll?.()
              }}
              type="button"
            >
              Select all
            </button>
            <button
              className="batch-btn"
              disabled={entities.length === 0}
              onClick={(event) => {
                event.stopPropagation()
                onDeselectAll?.()
              }}
              type="button"
            >
              Clear
            </button>
          </div>

          <div className="entity-list" style={{ maxHeight: listHeight }}>
            {groups.length === 0 ? (
              <div className="empty-list">No {title.toLowerCase()} detected.</div>
            ) : (
              groups.map((group) => (
                <GroupedEntityRow
                  group={group}
                  isExpanded={expandedGroups.has(group.text)}
                  key={group.text}
                  onDeselectEntityIds={onDeselectEntityIds}
                  onEntitySelect={onEntitySelect}
                  onNavigateToPage={onNavigateToPage}
                  onRedactionToggle={onRedactionToggle}
                  onSelectEntityIds={onSelectEntityIds}
                  onToggleExpand={() => toggleExpandGroup(group.text)}
                  redactedEntityIds={redactedEntityIds}
                  selectedEntityIds={selectedEntityIds}
                />
              ))
            )}
          </div>

          <div
            aria-label={`Resize ${title} section`}
            className="section-resizer"
            onPointerDown={onResizeStart}
            role="separator"
          />
        </>
      ) : null}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  EntityPanel                                                       */
/* ------------------------------------------------------------------ */

export function EntityPanel({
  entities,
  selectedEntityIds,
  redactedEntityIds,
  reviewQueue,
  redactionQueue,
  searchTerm,
  onSearchTermChange,
  onEntitySelect,
  onRedactionToggle,
  onSelectAllByType,
  onDeselectAllByType,
  onNavigateToPage,
  onSelectEntityIds,
  onDeselectEntityIds,
  onExportRedactions,
  onRedactionsClear,
  isExporting,
}: EntityPanelProps) {
  /* ---- section reorder state ---- */
  const [sectionOrder, setSectionOrder] = useState<PanelSection[]>([
    'dates',
    'names',
    'phones',
    'review',
    'redactions',
  ])
  const [draggingSection, setDraggingSection] = useState<PanelSection | null>(null)
  const [dragOverSection, setDragOverSection] = useState<PanelSection | null>(null)

  /* ---- section list height resize ---- */
  const [listHeights, setListHeights] = useState<Record<string, number>>({
    dates: 270,
    names: 270,
    phones: 220,
  })
  const sectionResizeRef = useRef<{
    section: string
    startY: number
    startHeight: number
  } | null>(null)

  /* ---- redaction queue bulk selection ---- */
  const [selectedRedactionIds, setSelectedRedactionIds] = useState<Set<string>>(new Set())

  /* ---- derived ---- */
  const dateEntities = useMemo(
    () => entities.filter((e) => e.type === 'date').sort(compareEntitiesByDocumentOrder),
    [entities],
  )
  const nameEntities = useMemo(
    () => entities.filter((e) => e.type === 'name').sort(compareEntitiesByDocumentOrder),
    [entities],
  )
  const phoneEntities = useMemo(
    () => entities.filter((e) => e.type === 'phone').sort(compareEntitiesByDocumentOrder),
    [entities],
  )

  const allRedactionsSelected =
    redactionQueue.length > 0 && redactionQueue.every((e) => selectedRedactionIds.has(e.id))

  /* ---- section resize handlers ---- */
  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const state = sectionResizeRef.current
      if (!state) return

      const delta = event.clientY - state.startY
      const nextHeight = Math.min(Math.max(state.startHeight + delta, 60), 600)
      setListHeights((prev) => ({ ...prev, [state.section]: nextHeight }))
    }

    const handlePointerUp = () => {
      if (!sectionResizeRef.current) return
      sectionResizeRef.current = null
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

  const startSectionResize = useCallback(
    (section: string) => (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      sectionResizeRef.current = {
        section,
        startY: event.clientY,
        startHeight: listHeights[section] ?? 270,
      }
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    },
    [listHeights],
  )

  /* ---- redaction bulk handlers ---- */
  const toggleRedactionSelect = useCallback((id: string) => {
    setSelectedRedactionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAllRedactions = useCallback(() => {
    if (allRedactionsSelected) {
      setSelectedRedactionIds(new Set())
    } else {
      setSelectedRedactionIds(new Set(redactionQueue.map((e) => e.id)))
    }
  }, [allRedactionsSelected, redactionQueue])

  const removeSelectedRedactions = useCallback(() => {
    for (const id of selectedRedactionIds) {
      const entity = redactionQueue.find((e) => e.id === id)
      if (entity) {
        onRedactionToggle(id, entity.pageIndex)
      }
    }
    setSelectedRedactionIds(new Set())
  }, [selectedRedactionIds, redactionQueue, onRedactionToggle])

  /* ---- drag-and-drop section reorder ---- */
  const handleDragStart = (event: React.DragEvent<HTMLElement>, section: PanelSection) => {
    setDraggingSection(section)
    setDragOverSection(section)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', section)
  }

  const handleDragEnd = () => {
    setDraggingSection(null)
    setDragOverSection(null)
  }

  const handleDragOver =
    (section: PanelSection) => (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault()
      if (dragOverSection !== section) {
        setDragOverSection(section)
      }
    }

  const handleDrop =
    (section: PanelSection) => (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault()

      if (!draggingSection || draggingSection === section) {
        setDragOverSection(null)
        return
      }

      setSectionOrder((current) => {
        const next = [...current]
        const fromIndex = next.indexOf(draggingSection)
        const toIndex = next.indexOf(section)

        if (fromIndex === -1 || toIndex === -1) {
          return current
        }

        next.splice(fromIndex, 1)
        next.splice(toIndex, 0, draggingSection)
        return next
      })

      setDragOverSection(null)
      setDraggingSection(null)
    }

  const getSectionDragHandleProps = (section: PanelSection) => ({
    draggable: true,
    onDragStart: (event: React.DragEvent<HTMLElement>) => handleDragStart(event, section),
    onDragEnd: handleDragEnd,
  })

  const getQueueDragHandleProps = (section: PanelSection) => ({
    draggable: true,
    onDragStart: (event: React.DragEvent<HTMLElement>) => handleDragStart(event, section),
    onDragEnd: handleDragEnd,
  })

  /* ---- render helpers ---- */

  const renderSection = (section: PanelSection) => {
    switch (section) {
      case 'dates':
        return (
          <EntitySection
            dragHandleProps={getSectionDragHandleProps(section)}
            entities={dateEntities}
            listHeight={listHeights.dates}
            onDeselectAll={() => onDeselectAllByType('date')}
            onDeselectEntityIds={onDeselectEntityIds}
            onEntitySelect={onEntitySelect}
            onNavigateToPage={onNavigateToPage}
            onRedactionToggle={onRedactionToggle}
            onResizeStart={startSectionResize('dates')}
            onSelectAll={() => onSelectAllByType('date')}
            onSelectEntityIds={onSelectEntityIds}
            redactedEntityIds={redactedEntityIds}
            selectedEntityIds={selectedEntityIds}
            title="Dates"
            type="date"
          />
        )

      case 'names':
        return (
          <EntitySection
            dragHandleProps={getSectionDragHandleProps(section)}
            entities={nameEntities}
            listHeight={listHeights.names}
            onDeselectAll={() => onDeselectAllByType('name')}
            onDeselectEntityIds={onDeselectEntityIds}
            onEntitySelect={onEntitySelect}
            onNavigateToPage={onNavigateToPage}
            onRedactionToggle={onRedactionToggle}
            onResizeStart={startSectionResize('names')}
            onSelectAll={() => onSelectAllByType('name')}
            onSelectEntityIds={onSelectEntityIds}
            redactedEntityIds={redactedEntityIds}
            selectedEntityIds={selectedEntityIds}
            title="Names"
            type="name"
          />
        )

      case 'phones':
        return (
          <EntitySection
            dragHandleProps={getSectionDragHandleProps(section)}
            entities={phoneEntities}
            listHeight={listHeights.phones}
            onDeselectAll={() => onDeselectAllByType('phone')}
            onDeselectEntityIds={onDeselectEntityIds}
            onEntitySelect={onEntitySelect}
            onNavigateToPage={onNavigateToPage}
            onRedactionToggle={onRedactionToggle}
            onResizeStart={startSectionResize('phones')}
            onSelectAll={() => onSelectAllByType('phone')}
            onSelectEntityIds={onSelectEntityIds}
            redactedEntityIds={redactedEntityIds}
            selectedEntityIds={selectedEntityIds}
            title="Phone numbers"
            type="phone"
          />
        )

      case 'review':
        return (
          <section className="review-queue themed neutral">
            <div className="queue-header drag-handle" {...getQueueDragHandleProps(section)}>
              <span>Selected for review</span>
              <strong>{reviewQueue.length}</strong>
            </div>

            {reviewQueue.length === 0 ? (
              <div className="empty-list">Click entities to build a focused review queue.</div>
            ) : (
              reviewQueue.map((entity) => (
                <button
                  className={`queue-chip ${entity.type}`}
                  key={entity.id}
                  onClick={() => onEntitySelect(entity)}
                  type="button"
                >
                  <span>{entity.text}</span>
                  <small>Page {entity.pageIndex + 1}</small>
                </button>
              ))
            )}
          </section>
        )

      case 'redactions':
        return (
          <section className="redaction-queue themed dark">
            <div className="queue-header drag-handle" {...getQueueDragHandleProps(section)}>
              <span>Marked for redaction</span>
              <strong>{redactionQueue.length}</strong>
            </div>

            {redactionQueue.length > 0 ? (
              <div className="redaction-toolbar">
                <button className="batch-btn" onClick={toggleAllRedactions} type="button">
                  {allRedactionsSelected ? 'Deselect all' : 'Select all'}
                </button>
                {selectedRedactionIds.size > 0 ? (
                  <button
                    className="batch-btn danger"
                    onClick={removeSelectedRedactions}
                    type="button"
                  >
                    Remove selected ({selectedRedactionIds.size})
                  </button>
                ) : null}
              </div>
            ) : null}

            {redactionQueue.length === 0 ? (
              <div className="empty-list">Use the Redact button to add items here.</div>
            ) : (
              redactionQueue.map((entity) => (
                <div className={`queue-chip ${entity.type}`} key={entity.id}>
                  <input
                    aria-label={`Select ${entity.text}`}
                    checked={selectedRedactionIds.has(entity.id)}
                    className="chip-check"
                    onChange={() => toggleRedactionSelect(entity.id)}
                    type="checkbox"
                  />
                  <span
                    className="chip-text"
                    onClick={() => onNavigateToPage(entity.pageIndex)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onNavigateToPage(entity.pageIndex)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {entity.text}
                  </span>
                  <small className="chip-page">Page {entity.pageIndex + 1}</small>
                  <button
                    aria-label={`Remove ${entity.text} from redaction queue`}
                    className="chip-delete"
                    onClick={() => onRedactionToggle(entity.id, entity.pageIndex)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))
            )}

            <div className="redaction-actions">
              <button
                className="primary-button"
                disabled={redactionQueue.length === 0 || isExporting}
                onClick={onExportRedactions}
                type="button"
              >
                {isExporting ? 'Exporting...' : 'Export redacted PDF'}
              </button>
              <button
                className="secondary-button"
                disabled={redactionQueue.length === 0 || isExporting}
                onClick={onRedactionsClear}
                type="button"
              >
                Clear All
              </button>
            </div>
          </section>
        )

      default:
        return null
    }
  }

  return (
    <aside aria-label="Detected entities" className="entity-panel">
      <div className="panel-heading">
        <span>Entity review</span>
      </div>

      <label className="search-box">
        <Search size={16} />
        <input
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Search any term"
          type="search"
          value={searchTerm}
        />
      </label>

      {sectionOrder.map((section) => (
        <div
          className={`panel-section${dragOverSection === section && draggingSection !== section ? ' drag-over' : ''}`}
          key={section}
          onDragOver={handleDragOver(section)}
          onDrop={handleDrop(section)}
        >
          {renderSection(section)}
        </div>
      ))}
    </aside>
  )
}

import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Entity } from '../types'

type EntityPanelProps = {
  entities: Entity[]
  selectedEntityIds: Set<string>
  reviewQueue: Entity[]
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onEntitySelect: (entity: Entity) => void
  onEntityToggle: (entityId: string) => void
}

function EntityRow({
  entity,
  selected,
  onClick,
}: {
  entity: Entity
  selected: boolean
  onClick: () => void
}) {
  return (
    <button className={`entity-row ${entity.type} ${selected ? 'selected' : ''}`} onClick={onClick} type="button">
      <span className="entity-text">{entity.text}</span>
      <span className="entity-page">Page {entity.pageIndex + 1}</span>
      <span className="entity-rule">{entity.rule}</span>
    </button>
  )
}

function EntitySection({
  title,
  type,
  entities,
  selectedEntityIds,
  onEntitySelect,
}: {
  title: string
  type: 'date' | 'name'
  entities: Entity[]
  selectedEntityIds: Set<string>
  onEntitySelect: (entity: Entity) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <section className="entity-section">
      <button className="section-toggle" onClick={() => setExpanded((value) => !value)} type="button">
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span>{title}</span>
        <strong className={type}>{entities.length}</strong>
      </button>

      {expanded ? (
        <div className="entity-list">
          {entities.length === 0 ? (
            <div className="empty-list">No {title.toLowerCase()} detected.</div>
          ) : (
            entities.map((entity) => (
              <EntityRow
                entity={entity}
                key={entity.id}
                onClick={() => onEntitySelect(entity)}
                selected={selectedEntityIds.has(entity.id)}
              />
            ))
          )}
        </div>
      ) : null}
    </section>
  )
}

export function EntityPanel({
  entities,
  selectedEntityIds,
  reviewQueue,
  searchTerm,
  onSearchTermChange,
  onEntitySelect,
  onEntityToggle,
}: EntityPanelProps) {
  const dateEntities = useMemo(() => entities.filter((entity) => entity.type === 'date'), [entities])
  const nameEntities = useMemo(() => entities.filter((entity) => entity.type === 'name'), [entities])

  return (
    <aside className="entity-panel" aria-label="Detected entities">
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

      <EntitySection
        entities={dateEntities}
        onEntitySelect={onEntitySelect}
        selectedEntityIds={selectedEntityIds}
        title="Dates"
        type="date"
      />
      <EntitySection
        entities={nameEntities}
        onEntitySelect={onEntitySelect}
        selectedEntityIds={selectedEntityIds}
        title="Names"
        type="name"
      />

      <section className="review-queue">
        <div className="queue-header">
          <span>Selected for review</span>
          <strong>{reviewQueue.length}</strong>
        </div>

        {reviewQueue.length === 0 ? (
          <div className="empty-list">Click entities to build a focused review queue.</div>
        ) : (
          reviewQueue.map((entity) => (
            <button className={`queue-chip ${entity.type}`} key={entity.id} onClick={() => onEntityToggle(entity.id)} type="button">
              <span>{entity.text}</span>
              <small>Page {entity.pageIndex + 1}</small>
            </button>
          ))
        )}
      </section>
    </aside>
  )
}


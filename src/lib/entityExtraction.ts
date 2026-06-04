import type { Entity, TextBox } from '../types'
import { sliceTextBox } from './coordinates'

const MONTHS =
  'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?'

const DATE_PATTERNS: Array<{ rule: string; regex: RegExp }> = [
  {
    rule: 'regex: DD/MM/YYYY',
    regex: /\b(?:0?[1-9]|[12]\d|3[01])\/(?:0?[1-9]|1[0-2])\/(?:19|20)\d{2}\b/g,
  },
  {
    rule: 'regex: DD-MM-YYYY',
    regex: /\b(?:0?[1-9]|[12]\d|3[01])-(?:0?[1-9]|1[0-2])-(?:19|20)\d{2}\b/g,
  },
  {
    rule: 'regex: DD-Mon-YYYY',
    regex: new RegExp(`\\b(?:0?[1-9]|[12]\\d|3[01])-(?:${MONTHS})-(?:19|20)\\d{2}\\b`, 'gi'),
  },
  {
    rule: 'regex: Month DD, YYYY',
    regex: new RegExp(`\\b(?:${MONTHS})\\s+(?:0?[1-9]|[12]\\d|3[01]),\\s*(?:19|20)\\d{2}\\b`, 'gi'),
  },
  {
    rule: 'regex: DD Month YYYY',
    regex: new RegExp(`\\b(?:0?[1-9]|[12]\\d|3[01])\\s+(?:${MONTHS})\\s+(?:19|20)\\d{2}\\b`, 'gi'),
  },
  {
    rule: 'regex: YYYY-MM-DD',
    regex: /\b(?:19|20)\d{2}-(?:0?[1-9]|1[0-2])-(?:0?[1-9]|[12]\d|3[01])\b/g,
  },
]

const NAME_PATTERN =
  /\b(?:Mr\.|Ms\.|Mrs\.|Dr\.\s+)?[A-Z][a-z]+(?:['’-][A-Z]?[a-z]+)?(?:\s+[A-Z][a-z]+(?:['’-][A-Z]?[a-z]+)?){1,3}\b/g

const NAME_STOP_PHRASES = new Set([
  'Page Number',
  'Show Dates',
  'Show Names',
  'Entity Panel',
  'PDF Viewer',
  'Redaction Assistant',
  'Review Memo',
  'Client Intake',
  'Case Timeline',
  'Reviewer Notes',
])

function makeEntityId(type: Entity['type'], pageIndex: number, boxId: string, start: number, text: string) {
  return `${type}-${pageIndex}-${boxId}-${start}-${text.replace(/\W+/g, '-').toLowerCase()}`
}

function collectMatches(
  textBox: TextBox,
  type: Entity['type'],
  pattern: RegExp,
  rule: string,
): Entity[] {
  const entities: Entity[] = []
  pattern.lastIndex = 0

  for (const match of textBox.text.matchAll(pattern)) {
    const text = match[0].trim()
    const matchIndex = match.index ?? 0

    if (
      !text ||
      (type === 'name' && NAME_STOP_PHRASES.has(text)) ||
      (type === 'name' && textBox.bbox.height > 18)
    ) {
      continue
    }

    entities.push({
      id: makeEntityId(type, textBox.pageIndex, textBox.id, matchIndex, text),
      type,
      text,
      pageIndex: textBox.pageIndex,
      bbox: sliceTextBox(textBox.bbox, textBox.text, matchIndex, text),
      rule,
    })
  }

  return entities
}

function dedupeEntities(entities: Entity[]) {
  const seen = new Set<string>()

  return entities.filter((entity) => {
    const key = [
      entity.type,
      entity.pageIndex,
      entity.text.toLowerCase(),
      Math.round(entity.bbox.x),
      Math.round(entity.bbox.y),
    ].join('|')

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

export function extractEntities(textBoxes: TextBox[]): Entity[] {
  const detected: Entity[] = []

  for (const textBox of textBoxes) {
    for (const pattern of DATE_PATTERNS) {
      detected.push(...collectMatches(textBox, 'date', pattern.regex, pattern.rule))
    }

    detected.push(...collectMatches(textBox, 'name', NAME_PATTERN, 'regex: title-case-name'))
  }

  return dedupeEntities(detected).sort((a, b) => {
    if (a.pageIndex !== b.pageIndex) {
      return a.pageIndex - b.pageIndex
    }

    return a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x
  })
}

export function extractSearchEntities(textBoxes: TextBox[], query: string): Entity[] {
  const normalized = query.trim()

  if (normalized.length < 2) {
    return []
  }

  const safeQuery = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const searchRegex = new RegExp(safeQuery, 'gi')

  return textBoxes.flatMap((textBox) =>
    collectMatches(textBox, 'search', searchRegex, 'user search'),
  )
}

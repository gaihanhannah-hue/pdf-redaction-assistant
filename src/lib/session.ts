const DRAFTS_KEY = 'pdf-redaction-assistant-drafts-v1'

export type SavedReviewDraft = {
  id: string
  fileName: string
  sourceBytesBase64: string
  selectedEntityIds: string[]
  redactedEntityIds: string[]
  activePage: number
  searchTerm: string
  savedAt: string
}

export type ReviewDraftSummary = {
  id: string
  fileName: string
  savedAt: string
}

function readDrafts() {
  const raw = localStorage.getItem(DRAFTS_KEY)

  if (!raw) {
    return []
  }

  try {
    return JSON.parse(raw) as SavedReviewDraft[]
  } catch {
    localStorage.removeItem(DRAFTS_KEY)
    return []
  }
}

function writeDrafts(drafts: SavedReviewDraft[]) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts))
}

export function listReviewDrafts(): ReviewDraftSummary[] {
  return readDrafts()
    .map(({ id, fileName, savedAt }) => ({ id, fileName, savedAt }))
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
}

export function saveReviewDraft(draft: SavedReviewDraft) {
  const drafts = readDrafts()
  writeDrafts([draft, ...drafts].slice(0, 12))
}

export function loadReviewDraft(id: string) {
  return readDrafts().find((draft) => draft.id === id) ?? null
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}

export function base64ToBytes(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

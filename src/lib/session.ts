const SESSION_KEY = 'pdf-redaction-assistant-session-v1'

export type SavedReviewSession = {
  fileName: string
  sourceBytesBase64: string
  selectedEntityIds: string[]
  redactedEntityIds: string[]
  activePage: number
  searchTerm: string
  savedAt: string
}

export function saveReviewSession(session: SavedReviewSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadReviewSession() {
  const raw = localStorage.getItem(SESSION_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as SavedReviewSession
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
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

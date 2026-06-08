import { FilePlus2, FileUp, Loader2, Printer, Save } from 'lucide-react'
import type { ReviewDraftSummary } from '../lib/session'

type UploadPanelProps = {
  fileName: string | null
  isLoading: boolean
  error: string | null
  drafts: ReviewDraftSummary[]
  hasDocument: boolean
  hasRedactions: boolean
  isDocumentActionRunning: boolean
  sessionMessage: string | null
  onFileSelected: (file: File) => void
  onLoadDraft: (draftId: string) => void
  onNewSession: () => void
  onPrint: () => void
  onSaveSession: () => void
}

export function UploadPanel({
  fileName,
  isLoading,
  error,
  drafts,
  hasDocument,
  hasRedactions,
  isDocumentActionRunning,
  sessionMessage,
  onFileSelected,
  onLoadDraft,
  onNewSession,
  onPrint,
  onSaveSession,
}: UploadPanelProps) {
  return (
    <section className="upload-card" aria-label="PDF upload">
      <div>
        <h1>PDF Redaction Assistant</h1>
        <p>
          Upload a PDF to detect dates, person names, and phone numbers, then review each
          highlight in context before deciding what should be redacted.
        </p>
      </div>

      <label className="upload-dropzone">
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              onFileSelected(file)
            }
          }}
        />
        {isLoading ? <Loader2 className="spin" size={24} /> : <FileUp size={24} />}
        <span>{isLoading ? 'Reading PDF...' : 'Choose PDF'}</span>
      </label>

      <div className="upload-meta" aria-live="polite">
        {fileName ? <span>Loaded: {fileName}</span> : <span>No document loaded yet</span>}
        {sessionMessage ? <span>{sessionMessage}</span> : null}
        {error ? <strong>{error}</strong> : null}
        <div className="document-actions">
          <span>{hasRedactions ? 'Current draft includes redactions' : 'Drafts stay in this browser'}</span>
          <button
            className="document-action-button"
            disabled={isDocumentActionRunning || isLoading}
            onClick={onNewSession}
            type="button"
          >
            <FilePlus2 size={18} />
            New Session
          </button>
          <select
            aria-label="Load saved draft"
            className="draft-select"
            disabled={drafts.length === 0 || isDocumentActionRunning || isLoading}
            onChange={(event) => {
              if (event.target.value) {
                onLoadDraft(event.target.value)
                event.target.value = ''
              }
            }}
            value=""
          >
            <option value="">Load draft...</option>
            {drafts.map((draft) => (
              <option key={draft.id} value={draft.id}>
                {draft.fileName} · {new Date(draft.savedAt).toLocaleString()}
              </option>
            ))}
          </select>
          {hasDocument ? (
            <>
              <button
                className="document-action-button"
                disabled={isDocumentActionRunning}
                onClick={onSaveSession}
                type="button"
              >
                {isDocumentActionRunning ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                Save Draft
              </button>
              <button
                className="document-action-button"
                disabled={isDocumentActionRunning}
                onClick={onPrint}
                type="button"
              >
                <Printer size={18} />
                Print PDF
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}

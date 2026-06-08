import { FileUp, Loader2, Printer, Save } from 'lucide-react'

type UploadPanelProps = {
  fileName: string | null
  isLoading: boolean
  error: string | null
  hasDocument: boolean
  hasRedactions: boolean
  isDocumentActionRunning: boolean
  sessionMessage: string | null
  onFileSelected: (file: File) => void
  onPrint: () => void
  onSaveSession: () => void
}

export function UploadPanel({
  fileName,
  isLoading,
  error,
  hasDocument,
  hasRedactions,
  isDocumentActionRunning,
  sessionMessage,
  onFileSelected,
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
        {hasDocument ? (
          <div className="document-actions">
            <span>{hasRedactions ? 'Current session includes redactions' : 'No redactions marked yet'}</span>
            <button
              className="document-action-button"
              disabled={isDocumentActionRunning}
              onClick={onSaveSession}
              type="button"
            >
              {isDocumentActionRunning ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              Save Session
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
          </div>
        ) : null}
      </div>
    </section>
  )
}

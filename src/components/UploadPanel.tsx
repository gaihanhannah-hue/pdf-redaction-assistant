import { FileUp, Loader2 } from 'lucide-react'

type UploadPanelProps = {
  fileName: string | null
  isLoading: boolean
  error: string | null
  onFileSelected: (file: File) => void
}

export function UploadPanel({ fileName, isLoading, error, onFileSelected }: UploadPanelProps) {
  return (
    <section className="upload-card" aria-label="PDF upload">
      <div>
        <h1>PDF Redaction Assistant</h1>
        <p>
          Upload a PDF to detect dates and person names, then review each
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
        {error ? <strong>{error}</strong> : null}
      </div>
    </section>
  )
}


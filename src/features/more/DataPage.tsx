import { useRef, useState } from 'react'
import { AlertTriangle, Download, FileUp, FlaskConical, History, Trash2 } from 'lucide-react'
import { Card, Page } from '@/components/Page'
import {
  exportFilename,
  parseImport,
  serializeExport,
  type ParseImportResult,
} from '@/lib/importExport'
import { formatLong } from '@/lib/dates'
import { daysSinceExport, markExported, readBackup } from '@/state/persist'
import { useStore } from '@/state/store'

type Pending = Extract<ParseImportResult, { ok: true }> & { source: string }

export function DataPage() {
  const data = useStore((s) => s.data)
  const replaceData = useStore((s) => s.replaceData)
  const resetAll = useStore((s) => s.resetAll)
  const restoreBackup = useStore((s) => s.restoreBackup)

  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [resetText, setResetText] = useState('')

  const backup = readBackup()
  const exportAge = daysSinceExport()
  const hasData = data.settings.startDate !== null || data.bodyLog.length > 0

  function handleParsed(result: ParseImportResult, source: string) {
    setMessage(null)
    if (!result.ok) {
      setError(result.error)
      setPending(null)
      return
    }
    setError(null)
    setPending({ ...result, source })
  }

  async function onFile(file: File) {
    handleParsed(parseImport(await file.text()), file.name)
  }

  async function loadSample() {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}sample-data.json`)
      if (!res.ok) throw new Error(String(res.status))
      handleParsed(parseImport(await res.text()), 'sample dataset')
    } catch {
      setError('Could not load the sample dataset.')
    }
  }

  function confirmImport() {
    if (!pending) return
    replaceData(pending.state, `import: ${pending.source}`)
    setPending(null)
    setMessage(`Imported ${pending.source}. Previous data saved as backup.`)
  }

  function doExport() {
    const blob = new Blob([serializeExport(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFilename()
    a.click()
    URL.revokeObjectURL(url)
    markExported()
    setMessage('Exported. Keep the file somewhere safe — it is your backup.')
  }

  return (
    <Page
      title="Data"
      subtitle="Import, export, backup and reset — everything stays on this device"
    >
      {(exportAge === null && hasData) || (exportAge !== null && exportAge >= 7) ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {exportAge === null
            ? 'No export yet — download a backup once you have data you care about.'
            : `Last export was ${exportAge} days ago — consider a fresh backup.`}
        </div>
      ) : null}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          {message}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <Card>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <FileUp className="h-4 w-4 text-red-600" aria-hidden /> Import
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Load the JSON produced by <code className="font-mono text-xs">tools/convert_xlsm.py</code>{' '}
          or a previous export. Nothing is applied until you confirm the preview.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onFile(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Choose file…
          </button>
          <button
            type="button"
            onClick={() => void loadSample()}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <FlaskConical className="h-4 w-4" aria-hidden /> Try sample data
          </button>
        </div>

        {pending && (
          <div className="mt-4 rounded-xl border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
            <h3 className="text-sm font-semibold">Preview — {pending.source}</h3>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Program</dt>
                <dd className="font-medium capitalize">{pending.summary.program}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Start date</dt>
                <dd className="font-medium">
                  {pending.summary.startDate ? formatLong(pending.summary.startDate) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Skipped days</dt>
                <dd className="font-medium">{pending.summary.skipCount}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Workout sessions</dt>
                <dd className="font-medium">{pending.summary.sessionCount}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Exercise entries</dt>
                <dd className="font-medium">{pending.summary.entryCount}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Body entries</dt>
                <dd className="font-medium">{pending.summary.bodyCount}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
              This replaces everything currently in the app. The current data is saved to the
              one-slot backup first.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={confirmImport}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Import & replace
              </button>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Download className="h-4 w-4 text-red-600" aria-hidden /> Export
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Download everything as JSON — the same format the import accepts. This is your off-device
          backup (browsers can evict local storage).
        </p>
        <button
          type="button"
          onClick={doExport}
          className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Download {exportFilename()}
        </button>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <History className="h-4 w-4 text-red-600" aria-hidden /> Backup slot
        </h2>
        {backup ? (
          <>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Saved {new Date(backup.savedAt).toLocaleString()} (before: {backup.reason}).
            </p>
            <button
              type="button"
              onClick={() => {
                if (restoreBackup())
                  setMessage('Backup restored. The replaced data is now in the backup slot.')
              }}
              className="mt-3 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Restore this backup
            </button>
          </>
        ) : (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Empty. A backup is written automatically before any import, reset or restore.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Trash2 className="h-4 w-4 text-red-600" aria-hidden /> Reset
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Clears all data (the Excel "CLEAR CONTENT" button, but undoable via the backup slot). Type{' '}
          <span className="font-mono font-semibold">RESET</span> to enable.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={resetText}
            onChange={(e) => setResetText(e.target.value)}
            placeholder="RESET"
            aria-label="Type RESET to confirm"
            className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="button"
            disabled={resetText !== 'RESET'}
            onClick={() => {
              resetAll()
              setResetText('')
              setMessage('All data cleared. The previous state is in the backup slot.')
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-red-700 disabled:opacity-40"
          >
            Reset everything
          </button>
        </div>
      </Card>
    </Page>
  )
}

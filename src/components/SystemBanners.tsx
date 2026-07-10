import { AlertTriangle, CloudAlert, DatabaseBackup } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSyncStore } from '@/state/sync'
import { useStore } from '@/state/store'

/**
 * App-level notices: corrupted-storage recovery (US-004/US-082), failing-writes
 * warning (quota / private mode), and the two cloud-sync states that only the user
 * can resolve (US-093). Rendered inside Layout.
 */
export function SystemBanners() {
  const bootIssue = useStore((s) => s.bootIssue)
  const storageFailing = useStore((s) => s.storageFailing)
  const restoreBackup = useStore((s) => s.restoreBackup)
  const acknowledge = useStore((s) => s.acknowledgeBootIssue)
  const syncStatus = useSyncStore((s) => s.status)
  const pausedAfterReset = useSyncStore((s) => s.config?.pausedReason === 'after-reset')

  return (
    <>
      {(syncStatus === 'conflict' || pausedAfterReset) && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <CloudAlert className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex-1">
            {syncStatus === 'conflict'
              ? 'This device and the cloud copy both changed. Nothing has been overwritten — choose which one to keep.'
              : 'Sync is paused after a reset, so the empty document is not uploaded. Choose which copy to keep.'}
          </span>
          <Link
            to="/more/sync"
            className="rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
          >
            Resolve
          </Link>
        </div>
      )}
      {bootIssue === 'corrupt' && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <DatabaseBackup className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex-1">
            Stored data could not be read and was quarantined. The app started fresh — you can
            restore the last automatic backup or re-import your data file.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!restoreBackup()) acknowledge()
              }}
              className="rounded-lg bg-amber-600 px-3 py-1.5 font-medium text-white hover:bg-amber-700"
            >
              Restore backup
            </button>
            <button
              type="button"
              onClick={acknowledge}
              className="rounded-lg px-3 py-1.5 font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      {storageFailing && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          <span>
            Changes are not being saved (storage is full or blocked). Export your data from More →
            Data as soon as possible.
          </span>
        </div>
      )}
    </>
  )
}

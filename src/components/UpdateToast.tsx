import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** New-version prompt (registerType 'prompt') + first-install offline notice. */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh && !offlineReady) return null

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md md:bottom-6">
      <div
        role="status"
        className="flex items-center gap-3 rounded-xl border border-zinc-300 bg-white p-3 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      >
        <RefreshCw className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
        {needRefresh ? (
          <>
            <span className="flex-1">A new version is available.</span>
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
            >
              Update
            </button>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="rounded-lg px-3 py-1.5 font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Later
            </button>
          </>
        ) : (
          <>
            <span className="flex-1">Ready to work offline.</span>
            <button
              type="button"
              onClick={() => setOfflineReady(false)}
              className="rounded-lg px-3 py-1.5 font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              OK
            </button>
          </>
        )}
      </div>
    </div>
  )
}

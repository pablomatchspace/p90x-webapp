import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  Cloud,
  CloudOff,
  Copy,
  Pause,
  Play,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Card, Page } from '@/components/Page'
import { MIN_PASSPHRASE_LENGTH } from '@/lib/sync'
import { deriveAuthToken } from '@/lib/syncCrypto'
import {
  disableSync,
  enableSync,
  pauseSync,
  resolveConflict,
  resumeAfterReset,
  resumeSync,
  syncNow,
  useSyncStore,
  type SyncStatus,
} from '@/state/sync'

const SETUP_GUIDE = 'https://github.com/pablomatchspace/p90x-webapp/blob/main/worker/README.md'

const STATUS_LABEL: Record<SyncStatus, string> = {
  disabled: 'Off',
  idle: 'Ready',
  syncing: 'Syncing…',
  synced: 'Synced',
  offline: 'Offline',
  error: 'Needs attention',
  conflict: 'Conflict',
  paused: 'Paused',
}

const primary =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white enabled:hover:bg-red-700 disabled:opacity-40'
const secondary =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium enabled:hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:enabled:hover:bg-zinc-800'

function TokenCard({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="mt-4 rounded-xl border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
      <h3 className="text-sm font-semibold">Set this as SYNC_TOKEN on your Worker</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Derived from your passphrase. It lets the Worker recognise you — it cannot decrypt your
        data. Paste it into the Worker's <code className="font-mono text-xs">SYNC_TOKEN</code>{' '}
        secret, then sync.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950">
          {token}
        </code>
        <button
          type="button"
          className={secondary}
          onClick={() => {
            void navigator.clipboard?.writeText(token).then(
              () => setCopied(true),
              () => setCopied(false),
            )
          }}
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function EnableForm() {
  const [endpoint, setEndpoint] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const result = await enableSync({ endpoint, passphrase, deviceName })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    void syncNow()
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Cloud className="h-4 w-4 text-red-600" aria-hidden /> Turn on cloud sync
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Keep two devices in step through a small backend <strong>you</strong> run, on your own free
        Cloudflare account. Your data is encrypted on this device before it is uploaded — the server
        stores ciphertext it cannot read.{' '}
        <a
          href={SETUP_GUIDE}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-red-600 underline"
        >
          Don't have an endpoint yet?
        </a>
      </p>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)}>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Endpoint URL</span>
          <input
            type="url"
            required
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://p90x-sync.your-name.workers.dev"
            className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Passphrase</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            At least {MIN_PASSPHRASE_LENGTH} characters. This is the encryption key: the same
            passphrase on your other device, and nowhere else. If you lose it, the cloud copy cannot
            be read — your data on this device is unaffected.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Device name</span>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Desktop"
            className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <div>
          <button type="submit" disabled={busy} className={primary}>
            {busy ? 'Enabling…' : 'Enable sync'}
          </button>
        </div>
      </form>
    </Card>
  )
}

export function SyncPage() {
  const config = useSyncStore((s) => s.config)
  const status = useSyncStore((s) => s.status)
  const message = useSyncStore((s) => s.message)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const conflictRemote = useSyncStore((s) => s.conflictRemote)
  const [token, setToken] = useState<string | null>(null)
  const busy = status === 'syncing'

  if (config === null) {
    return (
      <Page title="Cloud sync" subtitle="Off — your data stays on this device">
        <EnableForm />
      </Page>
    )
  }

  const pausedAfterReset = config.pausedReason === 'after-reset'

  return (
    <Page title="Cloud sync" subtitle={`${STATUS_LABEL[status]} · ${config.deviceName}`}>
      {status === 'conflict' && (
        <Card className="border-amber-300 dark:border-amber-700">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden /> Both copies changed
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            This device has changes that were never uploaded, and the cloud copy moved on (revision{' '}
            {conflictRemote?.revision ?? '—'}) — probably from your other device. Choose which one
            wins. Whichever you pick, the replaced document is saved to the backup slot in{' '}
            <strong>More → Data</strong> first.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className={primary}
              onClick={() => void resolveConflict('keep-local')}
            >
              Keep this device
            </button>
            <button
              type="button"
              disabled={busy}
              className={secondary}
              onClick={() => void resolveConflict('take-remote')}
            >
              Take the cloud copy
            </button>
          </div>
        </Card>
      )}

      {pausedAfterReset && (
        <Card className="border-amber-300 dark:border-amber-700">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden /> Paused after a reset
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            This device was reset while sync was on. Uploading now would replace your cloud copy
            with the empty document, so nothing has been sent. Which copy is the real one?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className={primary}
              onClick={() => void resumeAfterReset('restore-cloud')}
            >
              Restore from the cloud
            </button>
            <button
              type="button"
              disabled={busy}
              className={secondary}
              onClick={() => void resumeAfterReset('upload-empty')}
            >
              Upload this empty device
            </button>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Cloud className="h-4 w-4 text-red-600" aria-hidden /> Status
        </h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">State</dt>
            <dd className="font-medium">{STATUS_LABEL[status]}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Revision</dt>
            <dd className="font-medium">{config.lastRevision === 0 ? '—' : config.lastRevision}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Last synced</dt>
            <dd className="font-medium">
              {lastSyncedAt === null ? 'Never' : new Date(lastSyncedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
        <p className="mt-2 truncate text-xs text-zinc-500 dark:text-zinc-400">{config.endpoint}</p>
        {message && (
          <p role="status" className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {message}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || config.pausedReason !== null}
            className={primary}
            onClick={() => void syncNow()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden /> Sync now
          </button>
          {config.pausedReason === null ? (
            <button type="button" className={secondary} onClick={pauseSync}>
              <Pause className="h-4 w-4" aria-hidden /> Pause
            </button>
          ) : (
            !pausedAfterReset && (
              <button type="button" className={secondary} onClick={resumeSync}>
                <Play className="h-4 w-4" aria-hidden /> Resume
              </button>
            )
          )}
          <button
            type="button"
            className={secondary}
            onClick={() => void deriveAuthToken(config.passphrase).then(setToken)}
          >
            Show setup token
          </button>
        </div>
        {token !== null && <TokenCard token={token} />}
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CloudOff className="h-4 w-4 text-red-600" aria-hidden /> Turn off
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Turning sync off forgets the endpoint and passphrase on this device. Your data stays here,
          and the cloud copy stays where it is unless you delete it.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={secondary} onClick={() => void disableSync(false)}>
            Turn off sync
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
            onClick={() => {
              if (
                window.confirm(
                  'Delete the encrypted copy from your endpoint? This cannot be undone.',
                )
              ) {
                void disableSync(true)
              }
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Turn off & delete cloud copy
          </button>
        </div>
      </Card>
    </Page>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Flag, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { Card, Page } from '@/components/Page'
import { formatLong } from '@/lib/shared'
import type { ArchivedRound } from '@/lib/shared'
import { completeRound, deleteRound, renameRound, restoreRound } from '@/state/actions'
import { useAdherence, useSettings } from '@/state/selectors'
import { useStore } from '@/state/store'

/**
 * Rounds (E28 US-145): the lifecycle home. Complete-and-archive the running
 * round (guarded, with the seed-from-latest-weigh-in option and an export
 * nudge), browse archived rounds, and restore/rename/delete them. Archiving
 * never discards anything — the round moves inside the document and travels
 * with export/import/sync.
 */

const primaryButton =
  'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40'
const secondaryButton =
  'rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800'

function CurrentRoundCard({ onArchived }: { onArchived: (label: string) => void }) {
  const settings = useSettings()
  const adherence = useAdherence()
  const bodyLog = useStore((s) => s.data.bodyLog)
  const roundCount = useStore((s) => s.data.archivedRounds.length)
  const [confirming, setConfirming] = useState(false)
  const defaultLabel = `Round ${roundCount + 1}`
  const [label, setLabel] = useState(defaultLabel)
  const hasWeighIn = bodyLog.some(
    (e) => (e.weight ?? null) !== null || (e.bodyFat ?? null) !== null,
  )
  const [seed, setSeed] = useState(true)

  if (settings.startDate === null) {
    return (
      <Card>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Flag className="h-4 w-4 text-red-600" aria-hidden /> No round running
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Start the next round with a fresh 90-day schedule — your archived rounds stay right here
          for comparison.
        </p>
        <Link to="/start" className={`mt-3 inline-block ${primaryButton}`}>
          Start a program
        </Link>
      </Card>
    )
  }

  const day = adherence === null ? 0 : adherence.dayReached
  const total = adherence === null ? 90 : adherence.programDays
  const finished = adherence !== null && total > 0 && day >= total

  return (
    <Card className={finished ? 'border-emerald-300 dark:border-emerald-700' : ''}>
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Flag className="h-4 w-4 text-red-600" aria-hidden /> Current round
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {settings.program === 'lean' ? 'Lean' : 'Classic'} · started{' '}
        {formatLong(settings.startDate)} · day {day} of {total}
        {finished ? ' — complete!' : ''}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/rounds/live" className={secondaryButton}>
          View report {finished ? '' : 'so far'}
        </Link>
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className={primaryButton}>
            Complete round &amp; archive…
          </button>
        ) : null}
      </div>

      {confirming ? (
        <div className="mt-4 rounded-xl border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
          <h3 className="text-sm font-semibold">Archive this round?</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            The round — schedule, logs and weigh-ins — moves into the archive below and the app
            resets for the next one. Nothing is deleted, and you can restore it while no new round
            is running. Consider{' '}
            <Link to="/more/data" className="font-medium text-red-600 underline dark:text-red-400">
              downloading a backup
            </Link>{' '}
            first.
          </p>
          <label className="mt-3 block text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Label</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={defaultLabel}
              className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          {hasWeighIn ? (
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={seed}
                onChange={(e) => setSeed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-red-600"
              />
              <span>
                Use the latest weigh-in as the next round&rsquo;s starting weight / body fat
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  Otherwise the current SETUP start stats carry over unchanged.
                </span>
              </span>
            </label>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const finalLabel = label.trim() || defaultLabel
                completeRound({ label: finalLabel, seedFromLatest: hasWeighIn && seed })
                setConfirming(false)
                onArchived(finalLabel)
              }}
              className={primaryButton}
            >
              Archive round
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function ArchivedRoundCard({ round, canRestore }: { round: ArchivedRound; canRestore: boolean }) {
  const [renaming, setRenaming] = useState(false)
  const [label, setLabel] = useState(round.label)
  const [deleting, setDeleting] = useState(false)

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {renaming ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                renameRound(round.id, label)
                setRenaming(false)
              }}
            >
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                aria-label={`Rename ${round.label}`}
                className="w-40 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button type="submit" className="text-sm font-medium text-red-600 dark:text-red-400">
                Save
              </button>
            </form>
          ) : (
            <h2 className="truncate font-semibold">{round.label}</h2>
          )}
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {round.program === 'lean' ? 'Lean' : 'Classic'} · started {formatLong(round.startDate)}{' '}
            · archived {formatLong(round.archivedAt.slice(0, 10))}
          </p>
        </div>
        <Link
          to={`/rounds/${round.id}`}
          className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
        >
          Report →
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => restoreRound(round.id)}
          disabled={!canRestore}
          title={canRestore ? undefined : 'Finish or archive the current round first'}
          className={`flex items-center gap-1.5 ${secondaryButton}`}
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Restore
        </button>
        <button
          type="button"
          onClick={() => {
            setRenaming((r) => !r)
            setLabel(round.label)
          }}
          className={`flex items-center gap-1.5 ${secondaryButton}`}
        >
          <Pencil className="h-4 w-4" aria-hidden /> Rename
        </button>
        {!deleting ? (
          <button
            type="button"
            onClick={() => setDeleting(true)}
            className={`flex items-center gap-1.5 ${secondaryButton}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Delete
          </button>
        ) : (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-rose-600 dark:text-rose-400">Permanently delete?</span>
            <button
              type="button"
              onClick={() => deleteRound(round.id)}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setDeleting(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Keep
            </button>
          </span>
        )}
      </div>
    </Card>
  )
}

export function RoundsPage() {
  const rounds = useStore((s) => s.data.archivedRounds)
  const startDate = useStore((s) => s.data.settings.startDate)
  const [message, setMessage] = useState<string | null>(null)

  return (
    <Page title="Rounds" subtitle="Complete, archive and compare your 90-day rounds">
      {message ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          {message}
        </div>
      ) : null}

      <CurrentRoundCard
        onArchived={(label) =>
          setMessage(`${label} archived. Start your next round whenever you're ready.`)
        }
      />

      {rounds.length > 0 ? (
        <>
          <h2 className="mt-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            <Archive className="h-4 w-4" aria-hidden /> Archived rounds
          </h2>
          {[...rounds].reverse().map((round) => (
            <ArchivedRoundCard key={round.id} round={round} canRestore={startDate === null} />
          ))}
        </>
      ) : (
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No archived rounds yet. When you finish a round, archive it here — its report stays
            available forever, and the next round can be compared against it.
          </p>
        </Card>
      )}
    </Page>
  )
}

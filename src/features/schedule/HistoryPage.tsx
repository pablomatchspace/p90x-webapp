import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { describeOp, opEffect } from '@/lib/schedule'
import { revertScheduleOp } from '@/state/actions'
import { useSchedule } from '@/state/selectors'
import { useStore } from '@/state/store'
import { Chip } from './Chip'

/**
 * US-034 — the audit trail. Every op ever recorded is listed (newest first)
 * with its effect, its status against the current replay (an op can stop
 * applying when the op it depended on is reverted), and a one-tap undo.
 */
export function HistoryPage() {
  const ops = useStore((s) => s.data.scheduleOps)
  const schedule = useSchedule()
  const ignored = new Map((schedule?.ignoredOps ?? []).map((i) => [i.opId, i.reason]))
  const newestFirst = [...ops].reverse()

  return (
    <Page
      title="Reschedule history"
      subtitle="Every change, with undo"
      actions={
        <Link
          to="/schedule"
          className="flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Schedule
        </Link>
      }
    >
      {newestFirst.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No reschedules yet. Skip or swap days from any day&apos;s page.
          </p>
        </Card>
      ) : (
        newestFirst.map((op) => {
          const reverted = op.revertedAt !== undefined
          const notApplied = ignored.get(op.id)
          return (
            <Card key={op.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{describeOp(op)}</h2>
                {reverted ? (
                  <Chip tone="zinc">Reverted</Chip>
                ) : notApplied !== undefined ? (
                  <Chip tone="rose">Not applied</Chip>
                ) : (
                  <Chip tone="green">Active</Chip>
                )}
              </div>
              {notApplied !== undefined && !reverted ? (
                <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">
                  Not applied: {notApplied}
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{opEffect(op)}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Added {new Date(op.createdAt).toLocaleString()}
                </span>
                {!reverted ? (
                  <button
                    type="button"
                    onClick={() => revertScheduleOp(op.id)}
                    className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Undo
                  </button>
                ) : null}
              </div>
            </Card>
          )
        })
      )}
    </Page>
  )
}

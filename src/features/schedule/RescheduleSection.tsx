import { useMemo, useState } from 'react'
import { Card } from '@/components/Page'
import { compareISO, formatLong, isISODate } from '@/lib/dates'
import { getWorkout } from '@/lib/programData'
import type { ScheduleDay } from '@/lib/schedule/materialize'
import { newSkipOp, newSwapOp, nextProgramDateAfter } from '@/lib/schedule/ops'
import { addScheduleOp, revertScheduleOp } from '@/state/actions'
import { useOpPreview, useSchedule } from '@/state/selectors'

const ghostBtn =
  'rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
const primaryBtn =
  'rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700'

function contentLabel(day: ScheduleDay | undefined): string {
  if (day === undefined) return 'nothing (outside the program)'
  if (day.kind === 'gap') return 'a skipped day'
  return day.workouts.map((k) => getWorkout(k).name).join(' + ')
}

type Mode = 'skip' | 'swap' | 'pull' | null

/**
 * Reschedule actions for the day page (US-030..032). Every change is expressed
 * as an op previewed through the engine before it is committed, so a refusal
 * here is exactly what replay would refuse.
 */
export function RescheduleSection({ day }: { day: ScheduleDay }) {
  const schedule = useSchedule()
  const [mode, setMode] = useState<Mode>(null)
  const [swapTarget, setSwapTarget] = useState('')

  const pullSource = useMemo(
    () =>
      schedule !== null && day.kind === 'gap' ? nextProgramDateAfter(schedule, day.date) : null,
    [schedule, day],
  )

  const candidate = useMemo(() => {
    if (mode === 'skip') return newSkipOp(day.date)
    if (mode === 'pull' && pullSource !== null) return newSwapOp(day.date, pullSource)
    if (mode === 'swap' && isISODate(swapTarget) && swapTarget !== day.date)
      return newSwapOp(day.date, swapTarget)
    return null
  }, [mode, day.date, swapTarget, pullSource])

  const preview = useOpPreview(candidate)

  if (schedule === null) return null

  const confirm = () => {
    if (candidate === null) return
    addScheduleOp(candidate)
    setMode(null)
    setSwapTarget('')
  }
  const cancel = () => {
    setMode(null)
    setSwapTarget('')
  }

  const remaining = schedule.days.filter(
    (d) => d.kind === 'program' && compareISO(d.date, day.date) >= 0,
  ).length
  const here = schedule.byDate.get(day.date)
  const there = isISODate(swapTarget) ? schedule.byDate.get(swapTarget) : undefined

  return (
    <Card>
      <h2 className="font-semibold">Reschedule</h2>

      {mode === null ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {day.kind === 'gap' ? (
            <>
              <button type="button" className={ghostBtn} onClick={() => setMode('pull')}>
                Pull next workout forward
              </button>
              <button
                type="button"
                className={ghostBtn}
                onClick={() => revertScheduleOp(day.skipOpId)}
              >
                Undo this skip
              </button>
            </>
          ) : (
            <>
              <button type="button" className={ghostBtn} onClick={() => setMode('skip')}>
                Skip this day
              </button>
              <button type="button" className={ghostBtn} onClick={() => setMode('swap')}>
                Swap with another day
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3" aria-live="polite">
          {mode === 'swap' ? (
            <label className="flex flex-wrap items-center gap-2 text-sm">
              Swap with
              <input
                type="date"
                value={swapTarget}
                min={schedule.startDate}
                max={schedule.lastProgramDate}
                onChange={(e) => setSwapTarget(e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          ) : null}

          {mode === 'swap' && swapTarget === day.date ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Pick a different day.</p>
          ) : null}

          {preview !== null && !preview.ok ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">
              Can&apos;t apply this change: {preview.reason}. Nothing was modified.
            </p>
          ) : null}

          {preview !== null && preview.ok && preview.after !== null ? (
            <div className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
              {mode === 'skip' ? (
                <p>
                  {formatLong(day.date)} becomes a rest day and the {remaining} remaining workouts
                  move one day later. Projected finish:{' '}
                  <strong>{formatLong(preview.after.projectedCompletion)}</strong> (was{' '}
                  {formatLong(schedule.projectedCompletion)}).
                </p>
              ) : mode === 'pull' && pullSource !== null ? (
                <p>
                  {contentLabel(schedule.byDate.get(pullSource))} moves up from{' '}
                  {formatLong(pullSource)} to this day; {formatLong(pullSource)} becomes the skipped
                  day instead.
                </p>
              ) : (
                <>
                  <p>
                    {formatLong(day.date)} will have:{' '}
                    <strong>{contentLabel(preview.after.byDate.get(day.date))}</strong>
                  </p>
                  <p>
                    {formatLong(swapTarget)} will have:{' '}
                    <strong>{contentLabel(preview.after.byDate.get(swapTarget))}</strong>
                  </p>
                  {here?.kind === 'program' &&
                  there?.kind === 'program' &&
                  here.phase !== there.phase ? (
                    <p className="text-amber-700 dark:text-amber-400">
                      Heads up: this swap crosses phases (Phase {here.phase} ↔ Phase {there.phase}
                      ).
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {preview?.ok === true ? (
              <button type="button" className={primaryBtn} onClick={confirm}>
                {mode === 'skip'
                  ? 'Confirm skip'
                  : mode === 'pull'
                    ? 'Confirm pull-forward'
                    : 'Confirm swap'}
              </button>
            ) : null}
            <button type="button" className={ghostBtn} onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

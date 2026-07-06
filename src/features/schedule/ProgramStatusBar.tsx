import { compareISO, diffDays, formatLong, formatShort, todayISO } from '@/lib/dates'
import type { Schedule } from '@/lib/schedule/materialize'
import { useSchedule } from '@/state/selectors'
import { Chip } from './Chip'

/**
 * Program status header (US-023): where you are in the 90 days, plus the
 * workbook's two completion dates — planned (start + 90) vs projected
 * (day after the last program day, pushed out by skips).
 */

/** The day number reached by `date`: the latest program day on or before it. */
function dayNumberAt(schedule: Schedule, date: string): number {
  let reached = 0
  for (const d of schedule.days) {
    if (compareISO(d.date, date) > 0) break
    if (d.kind === 'program') reached = d.day
  }
  return reached
}

export function ProgramStatusBar() {
  const schedule = useSchedule()
  if (schedule === null) return null
  const today = todayISO()

  const beforeStart = compareISO(today, schedule.startDate) < 0
  const finished = compareISO(today, schedule.lastProgramDate) > 0
  const current = schedule.byDate.get(today)
  const reached = beforeStart ? 0 : finished ? 90 : dayNumberAt(schedule, today)
  const slip = diffDays(schedule.plannedCompletion, schedule.projectedCompletion)

  let headline: string
  if (beforeStart) {
    headline = `Starts ${formatLong(schedule.startDate)} — in ${diffDays(today, schedule.startDate)} days`
  } else if (finished) {
    headline = `Program complete — finished ${formatLong(schedule.lastProgramDate)}`
  } else if (current === undefined || current.kind === 'gap') {
    headline = `Skipped day — back on it tomorrow (day ${reached} of 90 so far)`
  } else {
    headline = `Day ${current.day} of 90`
  }

  return (
    <section
      aria-label="Program status"
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{headline}</span>
        {current?.kind === 'program' ? (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Week {current.week} · Phase {current.phase}
          </span>
        ) : null}
        {current?.kind === 'program' && current.recovery ? (
          <Chip tone="amber">Recovery week</Chip>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-valuenow={reached}
        aria-valuemin={0}
        aria-valuemax={90}
        aria-label={`Program progress: day ${reached} of 90`}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
      >
        <div className="h-full bg-red-600" style={{ width: `${(reached / 90) * 100}%` }} />
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span>Planned finish {formatShort(schedule.plannedCompletion)}</span>
        <span>Projected {formatShort(schedule.projectedCompletion)}</span>
        {slip > 0 ? (
          <Chip tone="rose">
            +{slip} day{slip === 1 ? '' : 's'}
          </Chip>
        ) : (
          <Chip tone="green">On plan</Chip>
        )}
      </p>
    </section>
  )
}

import { Link } from 'react-router-dom'
import { Card } from '@/components/Page'
import { formatLong, todayISO } from '@/lib/dates'
import type { WorkoutDef } from '@/lib/programData'
import type { ProgramDay } from '@/lib/schedule/materialize'
import { setSessionNotes } from '@/state/actions'
import { useWorkoutSessions } from '@/state/selectors'
import { hasTimeline } from '@/lib/timelines'
import { CompletionButtons } from './CompletionButtons'

/**
 * Cardio-style session list (US-044): one row per scheduled occurrence with
 * the YES / NO / NOT YET cycle and the free-text notes cell from the sheet.
 */
export function CompletionLog({
  def,
  occurrences,
}: {
  def: WorkoutDef
  occurrences: ProgramDay[]
}) {
  const sessions = useWorkoutSessions(def.key)
  const today = todayISO()

  return (
    <div className="flex flex-col gap-3">
      {occurrences.map((day) => {
        const session = sessions.get(day.programDayId)
        return (
          <Card
            key={day.programDayId}
            className={day.date === today ? 'ring-2 ring-red-600 dark:ring-red-500' : ''}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">
                  Week {day.week} ·{' '}
                  <Link to={`/day/${day.date}`} className="underline-offset-2 hover:underline">
                    {formatLong(day.date)}
                  </Link>
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Day {day.day} · Phase {day.phase}
                  {day.recovery ? ' · Recovery week' : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CompletionButtons
                  workoutKey={def.key}
                  programDayId={day.programDayId}
                  session={session}
                />
                {/* E16: guided play for completion workouts with an authored timeline */}
                {hasTimeline(def.key) ? (
                  <Link
                    to={`/workouts/${def.key}/play/${day.programDayId}`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Play workout
                  </Link>
                ) : null}
              </div>
            </div>
            <input
              type="text"
              aria-label={`Notes for ${formatLong(day.date)}`}
              value={session?.notes ?? ''}
              onChange={(e) => setSessionNotes(def.key, day.programDayId, e.target.value)}
              placeholder="Notes"
              className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Card>
        )
      })}
    </div>
  )
}

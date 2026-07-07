import { Link } from 'react-router-dom'
import { Card } from '@/components/Page'
import { formatLong, todayISO } from '@/lib/dates'
import type { WorkoutDef } from '@/lib/programData'
import type { ProgramDay } from '@/lib/schedule/materialize'
import { setSessionNotes } from '@/state/actions'
import { useWorkoutSessions } from '@/state/selectors'
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
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                  Day {day.day} · Phase {day.phase}
                  {day.recovery ? ' · Recovery week' : ''}
                </p>
              </div>
              <CompletionButtons
                workoutKey={def.key}
                programDayId={day.programDayId}
                session={session}
              />
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

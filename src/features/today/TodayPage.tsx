import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { NoProgramCard } from '@/components/NoProgramCard'
import { Card, Page } from '@/components/Page'
import { addDays, compareISO, formatLong, isISODate, todayISO, type ISODate } from '@/lib/dates'
import { getWorkout } from '@/lib/programData'
import type { ProgramDay } from '@/lib/schedule/materialize'
import { dayStatus, workoutState } from '@/lib/schedule/status'
import { BodyQuickAdd } from '@/features/body/BodyQuickAdd'
import { Chip } from '@/features/schedule/Chip'
import { ProgramStatusBar } from '@/features/schedule/ProgramStatusBar'
import { RescheduleSection } from '@/features/schedule/RescheduleSection'
import { CompletionButtons } from '@/features/workouts/CompletionButtons'
import {
  DAY_STATUS_LABELS,
  DAY_STATUS_TONES,
  WORKOUT_STATE_LABELS,
  WORKOUT_STATE_TONES,
} from '@/features/schedule/scheduleUi'
import { setWorkoutCompleted } from '@/state/actions'
import { useSchedule, useSessionIndex } from '@/state/selectors'

function WorkoutCard({
  day,
  workoutKey,
  title,
  intro,
}: {
  day: ProgramDay
  workoutKey: string
  title?: string
  intro?: string
}) {
  const index = useSessionIndex()
  const def = getWorkout(workoutKey)
  const session = index.get(day.programDayId)?.get(workoutKey)
  const state = workoutState(workoutKey, session)
  const entered = Object.keys(session?.entries ?? {}).length
  const total = def.exercises?.length ?? 0

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{title ?? def.name}</h2>
        <Chip tone={WORKOUT_STATE_TONES[state]}>{WORKOUT_STATE_LABELS[state]}</Chip>
      </div>
      {session?.annotation ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{session.annotation}</p>
      ) : null}
      {intro ? <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{intro}</p> : null}

      {def.style === 'completion' ? (
        <div className="mt-3">
          <CompletionButtons
            workoutKey={workoutKey}
            programDayId={day.programDayId}
            session={session}
          />
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {entered} of {total} exercises logged
          </p>
          {state === 'done' ? (
            <button
              type="button"
              onClick={() =>
                setWorkoutCompleted(
                  workoutKey,
                  day.programDayId,
                  session?.completed === true ? undefined : false,
                )
              }
              className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Mark not done
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setWorkoutCompleted(workoutKey, day.programDayId, true)}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Mark done
            </button>
          )}
          <Link
            to={`/workouts/${workoutKey}/focus/${day.programDayId}`}
            className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Log in focus mode
          </Link>
          <Link
            to={`/workouts/${workoutKey}?day=${day.programDayId}`}
            className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Open grid
          </Link>
        </div>
      )}
    </Card>
  )
}

export function TodayPage() {
  const params = useParams<{ date?: string }>()
  const schedule = useSchedule()
  const index = useSessionIndex()
  const today = todayISO()
  const date: ISODate = params.date !== undefined && isISODate(params.date) ? params.date : today
  const isToday = date === today

  if (schedule === null) {
    return (
      <Page title="Today" subtitle="What's on the plan">
        <NoProgramCard hint="Set a start date and today's workout shows up here — or import your existing data." />
      </Page>
    )
  }

  const day = schedule.byDate.get(date)
  const status = day === undefined ? null : dayStatus(day, index, today)

  const navButton =
    'flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'

  return (
    <Page
      title={isToday ? 'Today' : formatLong(date)}
      subtitle={
        day?.kind === 'program' ? (
          <>
            Day {day.day} of 90 · Week {day.week} · Phase {day.phase}
            {day.recovery ? ' · Recovery week' : ''}
          </>
        ) : isToday ? (
          formatLong(date)
        ) : undefined
      }
      actions={
        <>
          <Link to={`/day/${addDays(date, -1)}`} aria-label="Previous day" className={navButton}>
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
          {!isToday ? (
            <Link
              to="/today"
              className="flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Today
            </Link>
          ) : null}
          <Link to={`/day/${addDays(date, 1)}`} aria-label="Next day" className={navButton}>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Link>
        </>
      }
    >
      {isToday ? <ProgramStatusBar /> : null}

      {day === undefined ? (
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {compareISO(date, schedule.startDate) < 0
              ? `Nothing scheduled — the program starts ${formatLong(schedule.startDate)}.`
              : `Nothing scheduled — the program ended ${formatLong(schedule.lastProgramDate)}.`}
          </p>
        </Card>
      ) : day.kind === 'gap' ? (
        <Card>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Skipped day</h2>
            <Chip tone={DAY_STATUS_TONES.gap}>{DAY_STATUS_LABELS.gap}</Chip>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            The schedule shifted forward here — nothing to do. The rest of the program moved one day
            later.
          </p>
        </Card>
      ) : day.workouts.every((k) => getWorkout(k).style === 'rest') ? (
        <WorkoutCard
          day={day}
          workoutKey="x-stretch"
          title="Rest or X Stretch"
          intro="Recovery day — nothing required. Did you do an X Stretch anyway?"
        />
      ) : (
        <>
          {status !== null && (status === 'done' || status === 'missed') ? (
            <div>
              <Chip tone={DAY_STATUS_TONES[status]}>
                Day {DAY_STATUS_LABELS[status].toLowerCase()}
              </Chip>
            </div>
          ) : null}
          {day.workouts.map((key) => (
            <WorkoutCard key={key} day={day} workoutKey={key} />
          ))}
        </>
      )}

      {isToday ? <BodyQuickAdd /> : null}

      {day !== undefined ? <RescheduleSection day={day} /> : null}
    </Page>
  )
}

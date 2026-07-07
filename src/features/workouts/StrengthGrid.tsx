import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/Page'
import { compareISO, formatLong, formatShort, todayISO } from '@/lib/dates'
import type { WorkoutDef } from '@/lib/programData'
import type { ProgramDay } from '@/lib/schedule/materialize'
import { formatScore, scoreExercise, sessionTotals, type ExerciseScore } from '@/lib/scoring'
import { setSessionAnnotation, setSessionNotes, setWorkoutCompleted } from '@/state/actions'
import { useScoringSettings, useWorkoutSessions } from '@/state/selectors'
import { RoundInputs } from './entryUi'

function initialIndex(occurrences: ProgramDay[], dayParam: string | null, today: string): number {
  if (dayParam !== null) {
    const explicit = occurrences.findIndex((d) => d.programDayId === dayParam)
    if (explicit >= 0) return explicit
  }
  let current = 0
  for (let i = 0; i < occurrences.length; i++) {
    if (compareISO(occurrences[i].date, today) <= 0) current = i
  }
  return current
}

function ScoreLine({ name, result, showPenalty }: { name: string; result: ExerciseScore; showPenalty: boolean }) {
  if (result.score === null) {
    return <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
  }
  const penalty = showPenalty && result.penalty !== null && result.penalty > 0 ? result.penalty : null
  const label = `${name} score: ${formatScore(result.score)}${penalty !== null ? `, penalty ${formatScore(penalty)}` : ''}`
  return (
    <span aria-label={label} className="text-xs tabular-nums">
      <span className="font-semibold" aria-hidden>
        {formatScore(result.score)}
      </span>
      {penalty !== null ? (
        <span className="text-rose-600 dark:text-rose-400" aria-hidden>
          {' '}
          −{formatScore(penalty)}
        </span>
      ) : null}
    </span>
  )
}

const ghostBtn =
  'rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'

/**
 * The Excel week-block grid, one occurrence at a time (US-041): week switcher,
 * per-exercise rounds with live score/penalty, editable week annotation and
 * session notes, and — for strength sheets — a click-to-edit all-weeks net
 * overview on wider screens. ARX reuses it with a total-reps roll-up (US-045).
 */
export function StrengthGrid({ def, occurrences }: { def: WorkoutDef; occurrences: ProgramDay[] }) {
  const sessions = useWorkoutSessions(def.key)
  const scoring = useScoringSettings()
  const today = todayISO()
  const [searchParams] = useSearchParams()
  const [occIndex, setOccIndex] = useState(() =>
    initialIndex(occurrences, searchParams.get('day'), today),
  )

  const index = Math.min(occIndex, occurrences.length - 1)
  const day = occurrences[index]
  const session = sessions.get(day.programDayId)
  const exercises = def.exercises ?? []
  const totals = sessionTotals(session, def, scoring)
  const isArx = def.style === 'arx'

  const navBtn =
    'flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Previous week"
            className={navBtn}
            disabled={index === 0}
            onClick={() => setOccIndex(index - 1)}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <select
            aria-label="Week"
            value={index}
            onChange={(e) => setOccIndex(Number(e.target.value))}
            className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {occurrences.map((d, i) => (
              <option key={d.programDayId} value={i}>
                Week {d.week} — {formatShort(d.date)}
                {sessions.has(d.programDayId) ? ' · logged' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Next week"
            className={navBtn}
            disabled={index === occurrences.length - 1}
            onClick={() => setOccIndex(index + 1)}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Day {day.day} · Phase {day.phase}
          {day.recovery ? ' · Recovery week' : ''} ·{' '}
          <Link to={`/day/${day.date}`} className="underline-offset-2 hover:underline">
            {formatLong(day.date)}
          </Link>
        </p>
        <input
          type="text"
          aria-label="Week note"
          value={session?.annotation ?? ''}
          onChange={(e) => setSessionAnnotation(def.key, day.programDayId, e.target.value)}
          placeholder={'Week note (e.g. "2 with chestweight")'}
          className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Card>

      <Card>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {exercises.map((exercise) => {
            const result = scoreExercise(session?.entries?.[exercise.id], exercise, scoring)
            return (
              <div key={exercise.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-medium">{exercise.name}</h3>
                  <ScoreLine name={exercise.name} result={result} showPenalty={!isArx} />
                </div>
                <div className="mt-2">
                  <RoundInputs
                    workoutKey={def.key}
                    exercise={exercise}
                    occurrences={occurrences}
                    occIndex={index}
                    sessions={sessions}
                    drop={result.drop}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {isArx ? (
              <>
                Total reps: <strong className="tabular-nums">{formatScore(totals.score)}</strong>
              </>
            ) : (
              <>
                Session score <strong className="tabular-nums">{formatScore(totals.score)}</strong>
                {totals.penalty > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400">
                    {' '}
                    −{formatScore(totals.penalty)}
                  </span>
                ) : null}{' '}
                · net <strong className="tabular-nums">{formatScore(totals.net)}</strong>
              </>
            )}{' '}
            · {totals.entered} of {exercises.length} exercises
          </p>
          {session?.completed === true ? (
            <button
              type="button"
              className={ghostBtn}
              onClick={() => setWorkoutCompleted(def.key, day.programDayId, undefined)}
            >
              Mark not done
            </button>
          ) : (
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              onClick={() => setWorkoutCompleted(def.key, day.programDayId, true)}
            >
              Mark done
            </button>
          )}
        </div>
        <textarea
          aria-label="Session notes"
          rows={2}
          value={session?.notes ?? ''}
          onChange={(e) => setSessionNotes(def.key, day.programDayId, e.target.value)}
          placeholder="Session notes"
          className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Card>

      {!isArx && occurrences.length > 1 ? (
        <Card className="hidden md:block">
          <h2 className="font-semibold">All weeks — net score</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Score − penalty per week, dates from the live schedule. Click a week to edit it.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-zinc-500 dark:text-zinc-400">
                  <th className="py-1 pr-2 font-medium">Exercise</th>
                  {occurrences.map((d, i) => (
                    <th key={d.programDayId} className="px-2 py-1 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => setOccIndex(i)}
                        className={
                          i === index
                            ? 'font-bold text-red-600 dark:text-red-400'
                            : 'hover:text-zinc-800 dark:hover:text-zinc-200'
                        }
                      >
                        W{d.week}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exercises.map((exercise) => (
                  <tr key={exercise.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="py-1 pr-2">{exercise.name}</td>
                    {occurrences.map((d) => {
                      const net = scoreExercise(
                        sessions.get(d.programDayId)?.entries?.[exercise.id],
                        exercise,
                        scoring,
                      ).net
                      return (
                        <td key={d.programDayId} className="px-2 py-1 text-right tabular-nums">
                          {net === null ? (
                            <span className="text-zinc-300 dark:text-zinc-600">—</span>
                          ) : (
                            formatScore(net)
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

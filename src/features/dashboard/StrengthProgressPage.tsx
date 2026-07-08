import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { LineChart, type ChartSeries } from '@/components/LineChart'
import { loggableWorkouts } from '@/lib/programData'
import { workoutProgression } from '@/lib/progression'
import { formatScore } from '@/lib/scoring'
import { useSchedule, useScoringSettings, useWorkoutSessions } from '@/state/selectors'

/**
 * Strength progression charts (US-063): per-exercise net-score lines across a
 * workout's occurrences, with per-series toggles + check/uncheck-all (the Excel
 * DATA-sheet CheckAll parity) and a first-vs-latest "top movers" table. All
 * numbers come from the US-063 progression helper over the US-040 engine.
 */

const PALETTE = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#0ea5e9',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
  '#06b6d4',
  '#d946ef',
  '#eab308',
  '#64748b',
  '#a855f7',
]

const LOGGABLE = loggableWorkouts()

export function StrengthProgressPage() {
  const schedule = useSchedule()
  const scoring = useScoringSettings()
  const [workoutKey, setWorkoutKey] = useState(LOGGABLE[0]?.key ?? '')
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())

  const workout = LOGGABLE.find((w) => w.key === workoutKey) ?? LOGGABLE[0]
  const sessions = useWorkoutSessions(workout.key)

  const progression = useMemo(
    () => (schedule === null ? null : workoutProgression(schedule, workout, sessions, scoring)),
    [schedule, workout, sessions, scoring],
  )

  function selectWorkout(key: string) {
    setWorkoutKey(key)
    setHidden(new Set())
  }
  function toggle(id: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (schedule === null) {
    return (
      <Page title="Strength progression" subtitle="Net score per exercise across the weeks">
        <Card>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Import your program to chart strength progression.
          </p>
          <Link
            to="/more/data"
            className="mt-3 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Go to Import
          </Link>
        </Card>
      </Page>
    )
  }

  const allSeries = progression?.series ?? []
  const series: ChartSeries[] = allSeries
    .map((s, i) => ({
      id: s.exerciseId,
      label: s.label,
      color: PALETTE[i % PALETTE.length],
      points: s.points.map((y, x) => ({ x, y })),
    }))
    .filter((s) => !hidden.has(s.id))
  const xTicks = (progression?.occurrences ?? []).map((occ, i) => ({ x: i, label: `W${occ.week}` }))

  return (
    <Page title="Strength progression" subtitle="Net score (score − penalty) across the weeks">
      <Card>
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Workout</span>
          <select
            aria-label="Workout"
            value={workout.key}
            onChange={(e) => selectWorkout(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {LOGGABLE.map((w) => (
              <option key={w.key} value={w.key}>
                {w.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3">
          <LineChart
            series={series}
            xTicks={xTicks}
            yFormat={(v) => formatScore(v)}
            ariaLabel={`${workout.name} net score progression`}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Series</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setHidden(new Set())}
              className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Check all
            </button>
            <button
              type="button"
              onClick={() => setHidden(new Set(allSeries.map((s) => s.exerciseId)))}
              className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Uncheck all
            </button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
          {allSeries.map((s, i) => (
            <label key={s.exerciseId} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={!hidden.has(s.exerciseId)}
                onChange={() => toggle(s.exerciseId)}
              />
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                aria-hidden
              />
              <span className="truncate">{s.label}</span>
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Top movers</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          First vs latest logged net
        </p>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-400 dark:text-zinc-500">
              <th className="py-1 font-medium">Exercise</th>
              <th className="py-1 text-right font-medium">First</th>
              <th className="py-1 text-right font-medium">Latest</th>
              <th className="py-1 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {progression?.topMovers.map((m) => (
              <tr key={m.exerciseId} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-1">{m.label}</td>
                <td className="py-1 text-right tabular-nums">{formatScore(m.first)}</td>
                <td className="py-1 text-right tabular-nums">{formatScore(m.latest)}</td>
                <td
                  className={`py-1 text-right font-medium tabular-nums ${
                    m.delta === null || m.delta === 0
                      ? 'text-zinc-400 dark:text-zinc-500'
                      : m.delta > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500 dark:text-rose-400'
                  }`}
                >
                  {m.delta === null ? '—' : `${m.delta > 0 ? '+' : ''}${formatScore(m.delta)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Page>
  )
}

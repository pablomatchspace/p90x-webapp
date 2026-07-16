import { useMemo, useState } from 'react'
import { Card } from '@/components/Page'
import { LineChart, type ChartSeries } from '@/components/LineChart'
import { fractionToPercent, kgToUnit, weightUnit } from '@/lib/body'
import { todayISO } from '@/lib/shared'
import { getWorkout } from '@/lib/shared'
import { bodySeriesByDay, comparableWorkouts, netSeriesByOccurrence } from '@/lib/rounds'
import type { Adherence } from '@/lib/schedule'
import { buildRoundReport, type BodyOutcomeKey, type RoundData } from '@/lib/rounds'
import { formatScore } from '@/lib/workouts'
import type { Settings } from '@/lib/shared'
import type { Pt } from '@/lib/shared'

/**
 * Round-over-round comparison (E28 US-146): the current report's round
 * overlaid on another round. Body metrics align by day-of-round, workout net
 * totals by occurrence index (see `roundCompare.ts`); the other round always
 * draws grey and dashed so the round being viewed keeps the visual lead.
 */

export interface CompareCandidate {
  id: string
  label: string
  data: RoundData
  /** judge at the real today (running round) instead of projected completion */
  live?: boolean
}

const BODY_META: Record<BodyOutcomeKey, { label: string; color: string; dp: number }> = {
  weight: { label: 'Weight', color: '#ef4444', dp: 1 },
  bodyFat: { label: 'Body fat', color: '#f59e0b', dp: 1 },
  bmi: { label: 'BMI', color: '#8b5cf6', dp: 2 },
  leanMass: { label: 'Lean', color: '#10b981', dp: 1 },
  ffmi: { label: 'FFMI', color: '#0ea5e9', dp: 2 },
}
const BODY_KEYS = Object.keys(BODY_META) as BodyOutcomeKey[]
const OTHER_COLOR = '#a1a1aa'

/** Canonical → display units, applied point-by-point (linear conversions only). */
function toDisplaySeries(key: BodyOutcomeKey, points: Pt[], units: Settings['units']): Pt[] {
  return points.map((p) => {
    if (p.y === null) return p
    if (key === 'weight' || key === 'leanMass') return { ...p, y: kgToUnit(p.y, units) }
    if (key === 'bodyFat') return { ...p, y: fractionToPercent(p.y) }
    return p
  })
}

const selectClass =
  'rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950'

const DAY_TICKS = [1, 29, 57, 85].map((d) => ({ x: d, label: `D${d}` }))

export function RoundCompareSection({
  currentLabel,
  current,
  currentAdherence,
  others,
  units,
}: {
  currentLabel: string
  current: RoundData
  /** the viewed round's adherence, judged exactly as its report judges it */
  currentAdherence: Adherence
  others: CompareCandidate[]
  units: Settings['units']
}) {
  const [otherId, setOtherId] = useState(others[0]?.id)
  const other = others.find((o) => o.id === otherId) ?? others[0]

  const [bodyKey, setBodyKey] = useState<BodyOutcomeKey>('weight')
  const workouts = useMemo(
    () => (other === undefined ? [] : comparableWorkouts(current, other.data)),
    [current, other],
  )
  const [workoutKey, setWorkoutKey] = useState<string | undefined>(undefined)
  const workout =
    workoutKey !== undefined && workouts.includes(workoutKey) ? workoutKey : workouts[0]

  const otherAdherence = useMemo(
    () =>
      other === undefined
        ? null
        : buildRoundReport(other.data, other.live ? todayISO() : undefined).adherence,
    [other],
  )

  if (other === undefined) return null

  const bodyKeysWithData = BODY_KEYS.filter(
    (key) =>
      bodySeriesByDay(current, key).length > 0 || bodySeriesByDay(other.data, key).length > 0,
  )
  const activeBodyKey = bodyKeysWithData.includes(bodyKey) ? bodyKey : bodyKeysWithData[0]

  const bodySeries: ChartSeries[] =
    activeBodyKey === undefined
      ? []
      : [
          {
            id: 'current',
            label: currentLabel,
            color: BODY_META[activeBodyKey].color,
            points: toDisplaySeries(activeBodyKey, bodySeriesByDay(current, activeBodyKey), units),
          },
          {
            id: 'other',
            label: other.label,
            color: OTHER_COLOR,
            dashed: true,
            points: toDisplaySeries(
              activeBodyKey,
              bodySeriesByDay(other.data, activeBodyKey),
              units,
            ),
          },
        ]

  const netSeries: ChartSeries[] =
    workout === undefined
      ? []
      : [
          {
            id: 'current',
            label: currentLabel,
            color: '#ef4444',
            points: netSeriesByOccurrence(current, workout),
          },
          {
            id: 'other',
            label: other.label,
            color: OTHER_COLOR,
            dashed: true,
            points: netSeriesByOccurrence(other.data, workout),
          },
        ]

  const rate = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`)
  const bodyUnit =
    activeBodyKey === 'weight' || activeBodyKey === 'leanMass'
      ? ` (${weightUnit(units)})`
      : activeBodyKey === 'bodyFat'
        ? ' (%)'
        : ''

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Round over round</h2>
        {others.length > 1 ? (
          <label className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            vs
            <select
              value={other.id}
              onChange={(e) => setOtherId(e.target.value)}
              aria-label="Round to compare against"
              className={selectClass}
            >
              {others.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">vs {other.label}</span>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Solid: {currentLabel} · dashed grey: {other.label}. Body aligns by day of round, strength by
        the nth time each workout came up.
      </p>

      {otherAdherence !== null ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[22rem] text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="py-1.5 pr-2 font-medium">Round</th>
                <th className="py-1.5 pr-2 font-medium">Adherence</th>
                <th className="py-1.5 pr-2 font-medium">Done</th>
                <th className="py-1.5 pr-2 font-medium">Missed</th>
                <th className="py-1.5 font-medium">Skips</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: currentLabel, a: currentAdherence },
                { label: other.label, a: otherAdherence },
              ].map(({ label, a }) => (
                <tr key={label} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="py-1.5 pr-2 font-medium">{label}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{rate(a.adherenceRate)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {a.done}/{a.scheduled}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{a.missed}</td>
                  <td className="py-1.5 tabular-nums">{a.skips}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {activeBodyKey !== undefined ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Body — {BODY_META[activeBodyKey].label}
              {bodyUnit}
            </p>
            <select
              value={activeBodyKey}
              onChange={(e) => setBodyKey(e.target.value as BodyOutcomeKey)}
              aria-label="Body metric to compare"
              className={selectClass}
            >
              {bodyKeysWithData.map((key) => (
                <option key={key} value={key}>
                  {BODY_META[key].label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 max-w-lg">
            <LineChart
              series={bodySeries}
              xTicks={DAY_TICKS}
              xLabel={(x) => `Day ${x}`}
              yFormat={(v) => String(Math.round(v * 10) / 10)}
              showDots
              ariaLabel={`${BODY_META[activeBodyKey].label} by day of round, ${currentLabel} vs ${other.label}`}
            />
          </div>
        </div>
      ) : null}

      {workout !== undefined ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Strength — {getWorkout(workout).name} (session net)
            </p>
            <select
              value={workout}
              onChange={(e) => setWorkoutKey(e.target.value)}
              aria-label="Workout to compare"
              className={selectClass}
            >
              {workouts.map((key) => (
                <option key={key} value={key}>
                  {getWorkout(key).name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 max-w-lg">
            <LineChart
              series={netSeries}
              xTicks={netSeries[0].points.map((p) => ({ x: p.x, label: `#${p.x}` }))}
              xLabel={(x) => `Occurrence ${x}`}
              yFormat={formatScore}
              showDots
              includeZero
              ariaLabel={`${getWorkout(workout).name} net totals by occurrence, ${currentLabel} vs ${other.label}`}
            />
          </div>
        </div>
      ) : null}
    </Card>
  )
}

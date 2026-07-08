import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { LineChart, type ChartSeries, type RefLine } from '@/components/LineChart'
import {
  deriveBody,
  formatFixed,
  fractionToPercent,
  kgToUnit,
  targetWeight,
  threshold,
  weightUnit,
  type BodyDerived,
} from '@/lib/body'
import { addDays, compareISO, diffDays, formatShort, todayISO, type ISODate } from '@/lib/dates'
import type { Pt } from '@/lib/chart'
import type { BodyEntry, Settings } from '@/lib/schema'
import type { Schedule } from '@/lib/schedule/materialize'
import { useBodyLog, useSchedule, useSettings } from '@/state/selectors'
import { Chip } from '@/features/schedule/Chip'

/**
 * Body trend charts (US-061): each derived metric plotted against its SETUP
 * start / target / limit reference lines, with gaps for missing weigh-ins, a
 * phase/all range filter, and a progress-to-target read-out. All values reuse
 * the US-050 body engine, so a chart can never drift from the body-log page.
 */

type MetricKey = 'weight' | 'bodyFat' | 'bmi' | 'leanMass' | 'ffmi'

interface Metric {
  key: MetricKey
  label: string
  unit: string
  color: string
  dp: number
  higherIsBetter: boolean
  value: (entry: BodyEntry, derived: BodyDerived) => number | null
  start: number | null
  target: number | null
  limit: number | null
}

const TONE_CHIP = { good: 'green', watch: 'amber', over: 'rose' } as const

/** The date span of the phase that contains (or most recently preceded) today. */
function currentPhaseWindow(
  schedule: Schedule,
  today: ISODate,
): { start: ISODate; end: ISODate } | null {
  let phase: 1 | 2 | 3 | null = null
  for (const day of schedule.days) {
    if (day.kind !== 'program') continue
    if (compareISO(day.date, today) > 0) break
    phase = day.phase
  }
  if (phase === null) return null
  const dates = schedule.days
    .filter((d) => d.kind === 'program' && d.phase === phase)
    .map((d) => d.date)
  return dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : null
}

function buildMetrics(settings: Settings): Metric[] {
  const units = settings.units
  const unit = weightUnit(units)
  const w = (kg: number | null) => (kg === null ? null : kgToUnit(kg, units))
  const height = settings.height
  const h2 = height !== null && height !== undefined && height > 0 ? height * height : null
  const startW = settings.startWeight ?? null
  const startBf = settings.startBodyFat ?? null
  const tW = targetWeight(settings)
  const startLean = startW !== null && startBf !== null ? startW * (1 - startBf) : null
  const inc = settings.targets.leanMassIncrease ?? null
  const targetLean = startLean !== null && inc !== null ? startLean + inc : null
  const startBmi = startW !== null && h2 !== null ? startW / h2 : null
  const targetBmi = tW !== null && h2 !== null ? tW / h2 : null
  const startFfmi =
    startLean !== null && h2 !== null && height !== null && height !== undefined
      ? startLean / h2 + 6.1 * (1.8 - height)
      : null

  return [
    {
      key: 'weight',
      label: 'Weight',
      unit,
      color: '#ef4444',
      dp: 1,
      higherIsBetter: false,
      value: (e) => (e.weight != null ? kgToUnit(e.weight, units) : null),
      start: w(startW),
      target: w(tW),
      limit: w(settings.limits.weight ?? null),
    },
    {
      key: 'bodyFat',
      label: 'Body fat',
      unit: '%',
      color: '#f59e0b',
      dp: 1,
      higherIsBetter: false,
      value: (e) => fractionToPercent(e.bodyFat ?? null),
      start: fractionToPercent(startBf),
      target: fractionToPercent(settings.targets.bodyFat ?? null),
      limit: fractionToPercent(settings.limits.bodyFat ?? null),
    },
    {
      key: 'bmi',
      label: 'BMI',
      unit: '',
      color: '#8b5cf6',
      dp: 2,
      higherIsBetter: false,
      value: (_e, d) => d.bmi,
      start: startBmi,
      target: targetBmi,
      limit: settings.limits.bmi ?? null,
    },
    {
      key: 'leanMass',
      label: 'Lean',
      unit,
      color: '#10b981',
      dp: 1,
      higherIsBetter: true,
      value: (_e, d) => w(d.leanMass),
      start: w(startLean),
      target: w(targetLean),
      limit: null,
    },
    {
      key: 'ffmi',
      label: 'FFMI',
      unit: '',
      color: '#0ea5e9',
      dp: 2,
      higherIsBetter: true,
      value: (_e, d) => d.ffmi,
      start: startFfmi,
      target: null,
      limit: null,
    },
  ]
}

export function BodyTrendsPage() {
  const settings = useSettings()
  const bodyLog = useBodyLog()
  const schedule = useSchedule()
  const [metricKey, setMetricKey] = useState<MetricKey>('weight')
  const [range, setRange] = useState<'all' | 'phase'>('all')

  const metrics = useMemo(() => buildMetrics(settings), [settings])
  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0]

  const phaseWindow = useMemo(
    () => (schedule === null ? null : currentPhaseWindow(schedule, todayISO())),
    [schedule],
  )

  const entries = useMemo(() => {
    if (range === 'phase' && phaseWindow !== null) {
      return bodyLog.filter(
        (e) =>
          compareISO(e.date, phaseWindow.start) >= 0 && compareISO(e.date, phaseWindow.end) <= 0,
      )
    }
    return bodyLog
  }, [bodyLog, range, phaseWindow])

  const chart = useMemo(() => {
    if (entries.length === 0) return null
    const first = entries[0].date
    const last = entries[entries.length - 1].date
    const byDate = new Map(entries.map((e) => [e.date, e]))
    const points: Pt[] = []
    for (let day = first; compareISO(day, last) <= 0; day = addDays(day, 1)) {
      const e = byDate.get(day)
      const derived = e ? deriveBody(e, settings) : null
      points.push({ x: diffDays(first, day), y: e && derived ? metric.value(e, derived) : null })
    }
    const total = diffDays(first, last)
    const xTicks = [...new Set([0, Math.round(total / 3), Math.round((2 * total) / 3), total])].map(
      (x) => ({ x, label: formatShort(addDays(first, x)) }),
    )
    const latestEntry = entries[entries.length - 1]
    const latest = metric.value(latestEntry, deriveBody(latestEntry, settings))
    return { points, xTicks, latest }
  }, [entries, metric, settings])

  const refLines: RefLine[] = [
    metric.start !== null ? { label: 'Start', y: metric.start, tone: 'start' as const } : null,
    metric.target !== null ? { label: 'Target', y: metric.target, tone: 'target' as const } : null,
    metric.limit !== null ? { label: 'Limit', y: metric.limit, tone: 'limit' as const } : null,
  ].filter((r): r is RefLine => r !== null)

  const latest = chart?.latest ?? null
  const tone = metric.higherIsBetter ? null : threshold(latest, metric.target, metric.limit)
  const progress = useMemo(() => {
    if (latest === null || metric.start === null || metric.target === null) return null
    const denom = metric.higherIsBetter
      ? metric.target - metric.start
      : metric.start - metric.target
    const num = metric.higherIsBetter ? latest - metric.start : metric.start - latest
    if (denom === 0) return null
    return Math.round((num / denom) * 100)
  }, [latest, metric])

  const series: ChartSeries[] =
    chart === null
      ? []
      : [{ id: metric.key, label: metric.label, color: metric.color, points: chart.points }]

  return (
    <Page title="Body trends" subtitle="Progress against your SETUP targets">
      {bodyLog.length === 0 ? (
        <Card>
          <h2 className="font-semibold">No weigh-ins yet</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Log your morning weight to see trends against your start, target and limit lines.
          </p>
          <Link
            to="/body"
            className="mt-3 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Go to Body log
          </Link>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Metric">
            {metrics.map((m) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={m.key === metricKey}
                onClick={() => setMetricKey(m.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  m.key === metricKey
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-bold tabular-nums">
              {formatFixed(latest, metric.dp)}
              {metric.unit ? (
                <span className="ml-0.5 text-base font-normal">{metric.unit}</span>
              ) : null}
            </span>
            {tone !== null ? <Chip tone={TONE_CHIP[tone]}>{tone}</Chip> : null}
            {progress !== null ? (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {progress}% to target
              </span>
            ) : null}
            {phaseWindow !== null ? (
              <div className="ml-auto flex gap-1">
                {(['all', 'phase'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={range === r}
                    onClick={() => setRange(r)}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      range === r
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {r === 'all' ? 'All' : 'This phase'}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-3">
            <LineChart
              series={series}
              refLines={refLines}
              xTicks={chart?.xTicks ?? []}
              yFormat={(v) => formatFixed(v, metric.dp)}
              ariaLabel={`${metric.label} trend with start, target and limit reference lines`}
            />
          </div>

          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500">
            <span>— — Start</span>
            <span className="text-emerald-600 dark:text-emerald-400">— — Target</span>
            <span className="text-rose-500 dark:text-rose-400">— — Limit</span>
          </p>
        </Card>
      )}
    </Page>
  )
}

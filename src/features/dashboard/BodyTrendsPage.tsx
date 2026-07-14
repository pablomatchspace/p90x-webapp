import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { LineChart, type Band, type ChartSeries, type RefLine } from '@/components/LineChart'
import {
  deriveBody,
  formatFixed,
  fractionToPercent,
  kgToUnit,
  threshold,
  weightUnit,
} from '@/lib/body'
import { fillForward, movingAverage, type Pt } from '@/lib/chart'
import { addDays, compareISO, diffDays, formatShort, todayISO, type ISODate } from '@/lib/dates'
import type { Schedule } from '@/lib/schedule/materialize'
import { useBodyLog, useSchedule, useSettings } from '@/state/selectors'
import { Chip } from '@/features/schedule/Chip'
import { buildBodyMetrics, progressToTarget, TONE_CHIP, type MetricKey } from './bodyMetrics'

/**
 * Body trend charts (US-061, upgraded in E21/E25): each derived metric plotted
 * against its SETUP start / target / limit reference lines, with a phase/all
 * range filter and a progress-to-target read-out. E21 adds weigh-in markers, a
 * dashed 7-day trend overlay, phase shading, a crosshair read-out, and a
 * lean-vs-fat composition chart. E25 carries the last measurement forward
 * across missing days (fillForward) so lines never break, and lets the
 * composition chart toggle between absolute mass and percent of body weight.
 * Metric definitions come from the shared bodyMetrics engine, so the charts
 * and the dashboard KPI cards can never disagree.
 */

/** x-axis spans of the program phases, in days relative to `first` (chart x). */
function phaseBands(schedule: Schedule | null, first: ISODate): Band[] {
  if (schedule === null) return []
  const spans = new Map<1 | 2 | 3, { start: ISODate; end: ISODate }>()
  for (const day of schedule.days) {
    if (day.kind !== 'program') continue
    const span = spans.get(day.phase)
    if (span === undefined) spans.set(day.phase, { start: day.date, end: day.date })
    else span.end = day.date
  }
  return [...spans.entries()].map(([phase, span]) => ({
    x0: diffDays(first, span.start),
    x1: diffDays(first, span.end),
    label: `P${phase}`,
  }))
}

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

export function BodyTrendsPage() {
  const settings = useSettings()
  const bodyLog = useBodyLog()
  const schedule = useSchedule()
  const [metricKey, setMetricKey] = useState<MetricKey>('weight')
  const [range, setRange] = useState<'all' | 'phase'>('all')
  const [compMode, setCompMode] = useState<'abs' | 'pct'>('abs')

  const metrics = useMemo(() => buildBodyMetrics(settings), [settings])
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
    const raw: Pt[] = []
    const leanRaw: Pt[] = []
    const fatRaw: Pt[] = []
    const leanPctRaw: Pt[] = []
    const fatPctRaw: Pt[] = []
    for (let day = first; compareISO(day, last) <= 0; day = addDays(day, 1)) {
      const e = byDate.get(day)
      const derived = e ? deriveBody(e, settings) : null
      const x = diffDays(first, day)
      raw.push({ x, y: e && derived ? metric.value(e, derived) : null })
      leanRaw.push({
        x,
        y: derived?.leanMass != null ? kgToUnit(derived.leanMass, settings.units) : null,
      })
      fatRaw.push({
        x,
        y: derived?.bodyFatKg != null ? kgToUnit(derived.bodyFatKg, settings.units) : null,
      })
      const fatPctVal = fractionToPercent(e?.bodyFat ?? null)
      leanPctRaw.push({ x, y: fatPctVal === null ? null : 100 - fatPctVal })
      fatPctRaw.push({ x, y: fatPctVal })
    }
    // E25: carry the last measurement across missing days — unbroken lines.
    const points = fillForward(raw)
    const total = diffDays(first, last)
    const xTicks = [...new Set([0, Math.round(total / 3), Math.round((2 * total) / 3), total])].map(
      (x) => ({ x, label: formatShort(addDays(first, x)) }),
    )
    const latestEntry = entries[entries.length - 1]
    const latest = metric.value(latestEntry, deriveBody(latestEntry, settings))
    return {
      first,
      points,
      trend: movingAverage(points, 7),
      lean: fillForward(leanRaw),
      fat: fillForward(fatRaw),
      leanPct: fillForward(leanPctRaw),
      fatPct: fillForward(fatPctRaw),
      xTicks,
      latest,
    }
  }, [entries, metric, settings])

  const bands = useMemo(
    () => (chart === null ? [] : phaseBands(schedule, chart.first)),
    [schedule, chart],
  )
  const dateLabel = (x: number) => (chart === null ? '' : formatShort(addDays(chart.first, x)))

  const refLines: RefLine[] = [
    metric.start !== null ? { label: 'Start', y: metric.start, tone: 'start' as const } : null,
    metric.target !== null ? { label: 'Target', y: metric.target, tone: 'target' as const } : null,
    metric.limit !== null ? { label: 'Limit', y: metric.limit, tone: 'limit' as const } : null,
  ].filter((r): r is RefLine => r !== null)

  const latest = chart?.latest ?? null
  const tone = metric.higherIsBetter ? null : threshold(latest, metric.target, metric.limit)
  const progress = progressToTarget(metric, latest)

  const series: ChartSeries[] =
    chart === null
      ? []
      : [
          { id: metric.key, label: metric.label, color: metric.color, points: chart.points },
          ...(chart.trend.length >= 2
            ? [
                {
                  id: `${metric.key}-trend`,
                  label: '7-day trend',
                  color: metric.color,
                  points: chart.trend,
                  dashed: true,
                  width: 1.25,
                  noReadout: true,
                },
              ]
            : []),
        ]

  const unit = weightUnit(settings.units)
  // E25: the composition chart shows absolute mass or percent of body weight.
  const compAbs = compMode === 'abs'
  const compUnit = compAbs ? unit : '%'
  const compLean = compAbs ? chart?.lean : chart?.leanPct
  const compFat = compAbs ? chart?.fat : chart?.fatPct
  const hasComposition =
    chart !== null &&
    (chart.lean.some((p) => p.y !== null) || chart.leanPct.some((p) => p.y !== null))
  const composition: ChartSeries[] =
    !hasComposition || compLean === undefined || compFat === undefined
      ? []
      : [
          { id: 'lean', label: 'Lean', color: '#10b981', points: compLean },
          { id: 'fat', label: 'Fat', color: '#f59e0b', points: compFat },
        ]

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
              bands={bands}
              xTicks={chart?.xTicks ?? []}
              yFormat={(v) => formatFixed(v, metric.dp)}
              xLabel={dateLabel}
              showDots
              ariaLabel={`${metric.label} trend with start, target and limit reference lines`}
            />
          </div>

          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>— — Start</span>
            <span className="text-emerald-600 dark:text-emerald-400">— — Target</span>
            <span className="text-rose-500 dark:text-rose-400">— — Limit</span>
            {series.length > 1 ? <span>┄ 7-day trend</span> : null}
          </p>
        </Card>
      )}

      {hasComposition ? (
        <Card>
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold">Body composition</h2>
            {/* E25: display toggle — absolute mass vs percent of body weight */}
            <div className="flex gap-1" role="group" aria-label="Composition unit">
              {(['abs', 'pct'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={compMode === mode}
                  onClick={() => setCompMode(mode)}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    compMode === mode
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {mode === 'abs' ? unit : '%'}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Lean mass vs fat mass ({compUnit}) — recomp shows as the lines pulling apart
          </p>
          <div className="mt-3">
            <LineChart
              series={composition}
              bands={bands}
              xTicks={chart?.xTicks ?? []}
              yFormat={(v) => formatFixed(v, 1)}
              xLabel={dateLabel}
              showDots
              ariaLabel={`Lean mass vs fat mass in ${compUnit}`}
            />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Lean mass
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden /> Fat mass
            </span>
          </p>
        </Card>
      ) : null}
    </Page>
  )
}

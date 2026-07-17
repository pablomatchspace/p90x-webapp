import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { NoProgramCard } from '@/components/NoProgramCard'
import { formatFixed, fractionToPercent, kgToUnit } from '@/lib/body'
import { formatLong, todayISO } from '@/lib/shared'
import {
  archivedRoundData,
  buildRoundReport,
  liveRoundData,
  type BodyOutcomeKey,
  type RoundReport,
} from '@/lib/rounds'
import { formatScore } from '@/lib/workouts'
import type { RoundSnapshot, Settings } from '@/lib/shared'
import { Chip, type ChipTone } from '@/features/schedule/Chip'
import {
  buildBodyMetrics,
  progressToTarget,
  type BodyMetric,
} from '@/features/dashboard/bodyMetrics'
import { RoundCompareSection, type CompareCandidate } from '@/features/rounds/RoundCompareSection'
import { useSettings } from '@/state/selectors'
import { useStore } from '@/state/store'

/**
 * End-of-round report (E28 US-144): one screen for `/rounds/live` (the running
 * round, judged "so far") and `/rounds/:id` (an archived round, judged at its
 * projected completion). Everything is recomputed by `buildRoundReport` from
 * raw inputs; archived rounds read their frozen snapshot, so later Settings
 * changes never rewrite history.
 */

/** Canonical value → display units for a body outcome key. */
function toDisplay(key: BodyOutcomeKey, value: number | null, units: Settings['units']) {
  if (value === null) return null
  if (key === 'weight' || key === 'leanMass') return kgToUnit(value, units)
  if (key === 'bodyFat') return fractionToPercent(value)
  return value
}

function formatDelta(value: number | null, dp: number): string {
  if (value === null) return '—'
  const text = formatFixed(value, dp)
  return value > 0 ? `+${text}` : text
}

function BodyOutcomeCard({
  report,
  metrics,
  units,
}: {
  report: RoundReport
  metrics: BodyMetric[]
  units: Settings['units']
}) {
  const byKey = new Map(metrics.map((m) => [m.key, m]))
  const rows = report.body.filter((o) => o.latest !== null)
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Body outcome</h2>
        <Link
          to="/trends"
          className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
        >
          Trends →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          No weigh-ins were logged this round.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <th className="py-1.5 pr-2 font-medium">Metric</th>
                <th className="py-1.5 pr-2 font-medium">First</th>
                <th className="py-1.5 pr-2 font-medium">Last</th>
                <th className="py-1.5 pr-2 font-medium">Change</th>
                <th className="py-1.5 font-medium">Target</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const metric = byKey.get(o.key)
                if (metric === undefined) return null
                const first = toDisplay(o.key, o.first?.value ?? null, units)
                const latest = toDisplay(o.key, o.latest?.value ?? null, units)
                const delta = toDisplay(o.key, o.delta, units)
                const improved =
                  o.delta === null ? null : metric.higherIsBetter ? o.delta > 0 : o.delta < 0
                const deltaTone: ChipTone =
                  o.delta === null || o.delta === 0 ? 'zinc' : improved ? 'green' : 'rose'
                const pct = progressToTarget(metric, latest)
                return (
                  <tr key={o.key} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="py-1.5 pr-2 font-medium">
                      {metric.label}
                      {metric.unit ? (
                        <span className="ml-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          {metric.unit}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums">{formatFixed(first, metric.dp)}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{formatFixed(latest, metric.dp)}</td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      <Chip tone={deltaTone}>{formatDelta(delta, metric.dp)}</Chip>
                    </td>
                    <td className="py-1.5 text-zinc-500 tabular-nums dark:text-zinc-400">
                      {metric.target !== null
                        ? `${formatFixed(metric.target, metric.dp)}${pct !== null ? ` · ${pct}%` : ''}`
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function AdherenceOutcomeCard({ report }: { report: RoundReport }) {
  const a = report.adherence
  const rate = a.adherenceRate === null ? '—' : `${Math.round(a.adherenceRate * 100)}%`
  const stats: { label: string; value: string; sub?: string }[] = [
    { label: 'Adherence', value: rate, sub: `${a.done}/${a.scheduled} done` },
    {
      label: 'Missed',
      value: `${a.missed}`,
      sub: a.partial > 0 ? `+${a.partial} partial` : undefined,
    },
    {
      label: 'Skips',
      value: `${a.skips}`,
      sub: a.slipDays > 0 ? `+${a.slipDays}d finish` : 'on plan',
    },
    { label: 'Reached', value: `day ${a.dayReached}`, sub: `of ${a.programDays}` },
  ]
  return (
    <Card>
      <h2 className="font-semibold">Discipline</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-xl font-bold tabular-nums">{s.value}</p>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{s.label}</p>
            {s.sub ? <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{s.sub}</p> : null}
          </div>
        ))}
      </div>
    </Card>
  )
}

function StrengthOutcomeCard({ report }: { report: RoundReport }) {
  const logged = report.workouts.filter((w) => w.logged > 0)
  const gains = report.topMovers.filter((m) => (m.delta ?? 0) > 0).slice(0, 5)
  const drops = report.topMovers
    .filter((m) => (m.delta ?? 0) < 0)
    .slice(-3)
    .reverse()
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Strength outcome</h2>
        <Link
          to="/progress"
          className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
        >
          Charts →
        </Link>
      </div>
      {logged.length === 0 ? (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          No strength sessions were logged this round.
        </p>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[26rem] text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <th className="py-1.5 pr-2 font-medium">Workout</th>
                  <th className="py-1.5 pr-2 font-medium">Logged</th>
                  <th className="py-1.5 pr-2 font-medium">First net</th>
                  <th className="py-1.5 pr-2 font-medium">Last net</th>
                  <th className="py-1.5 font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {logged.map((w) => (
                  <tr key={w.key} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="py-1.5 pr-2 font-medium">{w.name}</td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {w.logged}/{w.occurrences}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums">{formatScore(w.firstNet)}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{formatScore(w.latestNet)}</td>
                    <td className="py-1.5 tabular-nums">
                      {w.delta === null ? (
                        <span className="text-zinc-500 dark:text-zinc-400">—</span>
                      ) : (
                        <Chip tone={w.delta > 0 ? 'green' : w.delta < 0 ? 'rose' : 'zinc'}>
                          {w.delta > 0 ? '+' : ''}
                          {formatScore(w.delta)}
                        </Chip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {gains.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Top movers (net score, first → last logged)
              </p>
              <ul className="mt-1.5 flex flex-col gap-1 text-sm">
                {gains.map((m) => (
                  <li
                    key={`${m.workoutKey}:${m.exerciseId}`}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span className="min-w-0 truncate">
                      {m.label}
                      <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {m.workoutName}
                      </span>
                    </span>
                    <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatScore(m.first)} → {formatScore(m.latest)} (+{formatScore(m.delta)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {drops.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Fell back</p>
              <ul className="mt-1.5 flex flex-col gap-1 text-sm">
                {drops.map((m) => (
                  <li
                    key={`${m.workoutKey}:${m.exerciseId}`}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span className="min-w-0 truncate">
                      {m.label}
                      <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {m.workoutName}
                      </span>
                    </span>
                    <span className="tabular-nums text-rose-600 dark:text-rose-400">
                      {formatScore(m.first)} → {formatScore(m.latest)} ({formatScore(m.delta)})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </Card>
  )
}

export function RoundReportPage() {
  const { id } = useParams()
  const settings = useSettings()
  const rounds = useStore((s) => s.data.archivedRounds)
  const state = useStore((s) => s.data)

  const live = id === 'live'
  const archived = live ? undefined : rounds.find((r) => r.id === id)
  const data = useMemo(
    () =>
      live ? liveRoundData(state) : archived !== undefined ? archivedRoundData(archived) : null,
    [live, state, archived],
  )
  const report = useMemo(
    () => (data === null ? null : buildRoundReport(data, live ? todayISO() : undefined)),
    [data, live],
  )

  // US-146: every other round is a comparison candidate — the running round
  // (when viewing an archive) plus all archives except the one on screen.
  const compareCandidates = useMemo<CompareCandidate[]>(() => {
    const candidates: CompareCandidate[] = []
    if (!live) {
      const liveData = liveRoundData(state)
      if (liveData !== null) {
        candidates.push({ id: 'live', label: 'Current round', data: liveData, live: true })
      }
    }
    for (const round of [...rounds].reverse()) {
      if (!live && round.id === id) continue
      candidates.push({ id: round.id, label: round.label, data: archivedRoundData(round) })
    }
    return candidates
  }, [live, id, state, rounds])

  if (data === null || report === null) {
    return (
      <Page title="Round report">
        {live ? (
          <NoProgramCard hint="Start a program or import your data to see a round report." />
        ) : (
          <Card>
            <h2 className="font-semibold">Round not found</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              This archived round doesn&rsquo;t exist (it may have been deleted).
            </p>
            <Link
              to="/rounds"
              className="mt-3 inline-block text-sm font-medium text-red-600 hover:underline dark:text-red-400"
            >
              ← All rounds
            </Link>
          </Card>
        )}
      </Page>
    )
  }

  const snapshot: RoundSnapshot = data.snapshot
  // The KPI metric descriptors, fed from the round's own inputs (frozen for
  // archives) — only the display units follow the live global setting.
  const metrics = buildBodyMetrics({
    ...settings,
    height: snapshot.height,
    startWeight: snapshot.startWeight,
    startBodyFat: snapshot.startBodyFat,
    targets: snapshot.targets,
    limits: snapshot.limits,
  })
  const title = live ? 'Round report' : (archived?.label ?? 'Round report')
  const range = `${formatLong(data.startDate)} → ${formatLong(report.schedule.lastProgramDate)}`
  const subtitle = live
    ? `So far — day ${report.adherence.dayReached} of ${report.adherence.programDays} · ${range}`
    : `${data.program === 'lean' ? 'Lean' : 'Classic'} · ${range}`

  return (
    <Page
      title={title}
      subtitle={subtitle}
      actions={
        <Link
          to="/rounds"
          className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
        >
          All rounds →
        </Link>
      }
    >
      {live && report.completed ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
          You&rsquo;ve reached the last program day — 90 days, done. Archive the round from{' '}
          <Link to="/rounds" className="font-medium underline">
            Rounds
          </Link>{' '}
          when you&rsquo;re ready to start the next one.
        </div>
      ) : null}
      <AdherenceOutcomeCard report={report} />
      <BodyOutcomeCard report={report} metrics={metrics} units={settings.units} />
      <StrengthOutcomeCard report={report} />
      {compareCandidates.length > 0 ? (
        <RoundCompareSection
          currentLabel={live ? 'Current round' : (archived?.label ?? 'This round')}
          current={data}
          currentAdherence={report.adherence}
          others={compareCandidates}
          units={settings.units}
        />
      ) : null}
    </Page>
  )
}

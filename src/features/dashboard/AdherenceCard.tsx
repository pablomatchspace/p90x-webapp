import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/Page'
import { LineChart } from '@/components/LineChart'
import { adherenceTrend } from '@/lib/schedule'
import { todayISO } from '@/lib/shared'
import { useAdherence, useSchedule, useSessionIndex } from '@/state/selectors'

/**
 * Adherence & pace card (US-060/062, upgraded in E21): discipline at a glance —
 * adherence rate, current streak, skips + slip, program progress — plus the
 * weekly completion bars, a cumulative adherence trend line, and a link into
 * the strength charts.
 */

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      {sub ? <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{sub}</p> : null}
    </div>
  )
}

export function AdherenceCard() {
  const a = useAdherence()
  const schedule = useSchedule()
  const index = useSessionIndex()
  const trend = useMemo(
    () => (schedule === null ? [] : adherenceTrend(schedule, index, todayISO())),
    [schedule, index],
  )
  if (a === null) return null
  const rate = a.adherenceRate === null ? '—' : `${Math.round(a.adherenceRate * 100)}%`
  const trendTicks = [1, 29, 57, 85]
    .filter((day) => day <= a.dayReached)
    .map((day) => ({ x: day, label: `W${(day - 1) / 7 + 1}` }))

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Adherence &amp; pace</h2>
        <Link
          to="/progress"
          className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
        >
          Strength →
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Adherence" value={rate} sub={`${a.done}/${a.scheduled} done`} />
        <Stat
          label="Streak"
          value={`${a.currentStreak}`}
          sub={a.currentStreak === 1 ? 'day' : 'days'}
        />
        <Stat
          label="Skips"
          value={`${a.skips}`}
          sub={a.slipDays > 0 ? `+${a.slipDays}d finish` : 'on plan'}
        />
        <Stat
          label="Program"
          value={`${Math.round(a.progress * 100)}%`}
          sub={`day ${a.dayReached}/${a.programDays}`}
        />
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Weekly completion</p>
        <div className="mt-2 flex items-end gap-1">
          {a.weeks.map((wk) => (
            <div
              key={wk.week}
              className="flex flex-1 flex-col items-center"
              title={`Week ${wk.week}: ${wk.done}/${wk.scheduled}`}
            >
              <div className="flex h-14 w-full items-end rounded bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`w-full rounded ${wk.started ? 'bg-red-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  style={{ height: `${Math.max((wk.ratio ?? 0) * 100, wk.done > 0 ? 6 : 0)}%` }}
                />
              </div>
              <span className="mt-0.5 text-[9px] text-zinc-500 dark:text-zinc-400">{wk.week}</span>
            </div>
          ))}
        </div>
      </div>

      {trend.filter((p) => p.y !== null).length >= 2 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Adherence trend (cumulative % of scheduled days done)
          </p>
          <div className="mt-2 max-w-lg">
            <LineChart
              series={[{ id: 'adherence', label: 'Adherence', color: '#ef4444', points: trend }]}
              xTicks={trendTicks}
              yFormat={(v) => `${Math.round(v)}%`}
              xLabel={(x) => `Day ${x}`}
              includeZero
              ariaLabel="Cumulative adherence rate across the program days"
            />
          </div>
        </div>
      ) : null}
    </Card>
  )
}

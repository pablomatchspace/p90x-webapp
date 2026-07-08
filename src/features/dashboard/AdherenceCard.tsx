import { Link } from 'react-router-dom'
import { Card } from '@/components/Page'
import { useAdherence } from '@/state/selectors'

/**
 * Adherence & pace card (US-060/062): discipline at a glance — adherence rate,
 * current streak, skips + slip, program progress — plus the weekly completion
 * bars and a link into the strength charts.
 */

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      {sub ? <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{sub}</p> : null}
    </div>
  )
}

export function AdherenceCard() {
  const a = useAdherence()
  if (a === null) return null
  const rate = a.adherenceRate === null ? '—' : `${Math.round(a.adherenceRate * 100)}%`

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
              <span className="mt-0.5 text-[9px] text-zinc-400 dark:text-zinc-500">{wk.week}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

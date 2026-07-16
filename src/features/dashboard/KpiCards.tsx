import { Link } from 'react-router-dom'
import { Card } from '@/components/Page'
import { deriveBody, formatFixed, threshold } from '@/lib/body'
import { Chip } from '@/features/schedule/Chip'
import { todayISO } from '@/lib/shared'
import { useBodyLog, useSettings } from '@/state/selectors'
import { buildBodyMetrics, expectedProgressPct, progressToTarget, TONE_CHIP } from './bodyMetrics'

/**
 * Body-vs-target KPI cards (US-060): the latest weigh-in's derived metrics, each
 * tinted against its target/limit and captioned with progress-to-target, linking
 * through to the full trend charts. Reads the shared bodyMetrics engine.
 */
export function KpiCards() {
  const settings = useSettings()
  const bodyLog = useBodyLog()
  const latest = bodyLog.length > 0 ? bodyLog[bodyLog.length - 1] : null
  const metrics = buildBodyMetrics(settings)
  const derived = latest ? deriveBody(latest, settings) : null
  const expected = expectedProgressPct(settings.startDate, todayISO())

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Body vs targets</h2>
        <Link
          to="/trends"
          className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
        >
          Trends →
        </Link>
      </div>
      {latest === null || derived === null ? (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Log a weigh-in to see your numbers against target.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((m) => {
            const value = m.value(latest, derived)
            const tone = m.higherIsBetter ? null : threshold(value, m.target, m.limit)
            const pct = progressToTarget(m, value)
            // Only FFMI compares target progress with elapsed program time.
            const pace =
              m.key === 'ffmi' && m.target !== null && pct !== null && expected !== null
                ? pct >= expected + 10
                  ? 'ahead'
                  : pct >= expected - 5
                    ? 'on pace'
                    : 'behind'
                : null
            return (
              <div
                key={m.key}
                className="rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {m.label}
                  </span>
                  {tone !== null ? <Chip tone={TONE_CHIP[tone]}>{tone}</Chip> : null}
                  {pace !== null ? (
                    <Chip tone={pace === 'behind' ? TONE_CHIP.watch : TONE_CHIP.good}>{pace}</Chip>
                  ) : null}
                </div>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {formatFixed(value, m.dp)}
                  {m.unit ? (
                    <span className="ml-0.5 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                      {m.unit}
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {m.target !== null
                    ? `Target ${formatFixed(m.target, m.dp)}${pct !== null ? ` · ${pct}%` : ''}`
                    : 'No target set'}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

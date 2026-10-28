import { Link } from 'react-router-dom'
import { Card } from '@/components/Page'
import {
  FFMI_BANDS,
  FFMI_CEILING,
  ffmiScalePosition,
  ffmiSummary,
  formatFixed,
  type FfmiBandKey,
  type FfmiSummary,
} from '@/lib/body'
import type { Sex } from '@/lib/body'
import { useBodyLog, useFeature, useSettings } from '@/state/selectors'

/**
 * E40: the FFMI statistic (start → current → change → target) with its visual
 * reference scale. Shared by the Body page (full) and the dashboard (compact).
 * Reads the pure ffmiSummary / FFMI_BANDS — the bands and their sources live in
 * lib/body/ffmiScale.ts and docs/requirements/ffmi-tdee-science.md.
 */

const BAND_COLOR: Record<FfmiBandKey, string> = {
  low: 'bg-rose-400 dark:bg-rose-500',
  below: 'bg-amber-300 dark:bg-amber-400',
  above: 'bg-emerald-300 dark:bg-emerald-500',
  athletic: 'bg-sky-400 dark:bg-sky-500',
  beyond: 'bg-violet-400 dark:bg-violet-500',
}

const pct = (position: number) => `${(position * 100).toFixed(2)}%`

function signed(value: number | null): string {
  if (value === null) return '—'
  return `${value >= 0 ? '+' : ''}${formatFixed(value, 2)}`
}

/** Colored band bar with Start / Current / Target markers and (women) the natural ceiling tick. */
export function FfmiScale({
  summary,
  gender,
  compact = false,
}: {
  summary: FfmiSummary
  gender: Sex
  compact?: boolean
}) {
  const edges = FFMI_BANDS.map((b) => (Number.isFinite(b.from) ? b.from : 0))
  const description = [
    summary.current !== null && summary.band !== null
      ? `Current FFMI ${formatFixed(summary.current, 2)}, ${summary.band.label}`
      : null,
    summary.start !== null ? `start ${formatFixed(summary.start, 2)}` : null,
    summary.target !== null ? `target ${formatFixed(summary.target, 2)}` : null,
  ]
    .filter((s) => s !== null)
    .join(', ')

  const marker = (value: number | null, kind: 'start' | 'current' | 'target') => {
    if (value === null) return null
    const shape =
      kind === 'current'
        ? 'h-4 w-4 rounded-full border-2 border-white bg-zinc-900 dark:border-zinc-900 dark:bg-white'
        : kind === 'start'
          ? 'h-3 w-3 rounded-full border-2 border-zinc-900 bg-white dark:border-white dark:bg-zinc-900'
          : 'h-3 w-3 rotate-45 border-2 border-red-600 bg-white dark:bg-zinc-900'
    return (
      <span
        key={kind}
        data-marker={kind}
        aria-hidden
        className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${shape}`}
        style={{ left: pct(ffmiScalePosition(value)) }}
      />
    )
  }

  return (
    <div>
      <div role="img" aria-label={`FFMI scale: ${description || 'no values yet'}`}>
        <div className="relative h-4">
          <div className="absolute inset-x-0 top-1/2 flex h-2.5 -translate-y-1/2 overflow-hidden rounded-full">
            {FFMI_BANDS.map((band, i) => {
              const from = i === 0 ? 0 : ffmiScalePosition(edges[i])
              const to = i === FFMI_BANDS.length - 1 ? 1 : ffmiScalePosition(edges[i + 1])
              return (
                <span
                  key={band.key}
                  data-band={band.key}
                  className={BAND_COLOR[band.key]}
                  style={{ width: pct(to - from) }}
                />
              )
            })}
          </div>
          {gender === 'female' ? (
            <span
              data-marker="ceiling"
              aria-hidden
              title={`Natural ceiling for women ≈ ${FFMI_CEILING.female}`}
              className="absolute top-0 h-4 w-0.5 -translate-x-1/2 bg-zinc-700 dark:bg-zinc-200"
              style={{ left: pct(ffmiScalePosition(FFMI_CEILING.female)) }}
            />
          ) : null}
          {marker(summary.start, 'start')}
          {marker(summary.target, 'target')}
          {marker(summary.current, 'current')}
        </div>
        <div className="relative mt-0.5 h-4 text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
          {edges.slice(1).map((edge) => (
            <span
              key={edge}
              className="absolute -translate-x-1/2"
              style={{ left: pct(ffmiScalePosition(edge)) }}
            >
              {edge}
            </span>
          ))}
        </div>
      </div>
      {compact ? null : (
        <>
          <ul className="mt-2 grid gap-x-4 gap-y-1 text-xs text-zinc-600 sm:grid-cols-2 dark:text-zinc-300">
            {FFMI_BANDS.map((band, i) => {
              const next = FFMI_BANDS[i + 1]
              const range =
                i === 0
                  ? `under ${FFMI_BANDS[1].from}`
                  : next
                    ? `${band.from}–${next.from}`
                    : `${band.from}+`
              return (
                <li key={band.key} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${BAND_COLOR[band.key]}`} />
                  <span>
                    <span className="font-medium">{band.label}</span> · {range}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>○ Start</span>
            <span>● Current</span>
            <span>◇ Target</span>
            {gender === 'female' ? <span>| Natural ceiling ≈ {FFMI_CEILING.female}</span> : null}
          </p>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
      {detail ? <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{detail}</p> : null}
    </div>
  )
}

export function FfmiCard({ compact = false }: { compact?: boolean }) {
  const settings = useSettings()
  const bodyLog = useBodyLog()
  const summary = ffmiSummary(settings, bodyLog)
  const hasAny = summary.start !== null || summary.current !== null
  const enabled = useFeature('ffmi')
  if (!enabled) return null

  return (
    <Card>
      <h2 className="font-semibold">FFMI</h2>
      {!hasAny ? (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Set your height and start weight / body-fat in{' '}
          <Link to="/more/settings" className="font-medium text-red-600 hover:underline">
            Settings
          </Link>
          , then log a weigh-in with body-fat to see your fat-free mass index.
        </p>
      ) : (
        <>
          <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Start" value={formatFixed(summary.start, 2)} />
            <Stat
              label="Current"
              value={formatFixed(summary.current, 2)}
              detail={summary.band?.label}
            />
            <Stat label="Change" value={signed(summary.change)} />
            <Stat
              label="Target"
              value={summary.target !== null ? formatFixed(summary.target, 2) : '—'}
              detail={
                summary.progressPct !== null ? `${summary.progressPct}% of the way` : undefined
              }
            />
          </dl>
          <div className="mt-4">
            <FfmiScale summary={summary} gender={settings.gender} compact={compact} />
          </div>
          {compact ? null : (
            <details className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
              <summary className="cursor-pointer font-medium">Where these bands come from</summary>
              <ul className="mt-2 space-y-1">
                {FFMI_BANDS.slice(1).map((band) => (
                  <li key={band.key}>
                    <span className="font-medium">{band.from}</span> — {band.source}
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                FFMI is lean mass ÷ height², normalized to a 1.80 m reference height (Kouri 1995).
                Population anchors come from men; women typically sit about 3 points lower
                {settings.gender === 'female'
                  ? ', so the tick marks the ≈23.9 natural ceiling for women.'
                  : '.'}{' '}
                Body-fat readings are noisy — judge the trend, not a single day.
              </p>
            </details>
          )}
        </>
      )}
    </Card>
  )
}

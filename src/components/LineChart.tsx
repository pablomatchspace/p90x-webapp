import { extent, linePath, niceTicks, scale, type Pt } from '@/lib/chart'

/**
 * Presentational multi-series line chart (US-061 / US-063). All axis + gap math
 * lives in `@/lib/chart`; this shell only maps the computed geometry onto SVG,
 * so it stays theme-aware (Tailwind stroke/fill utilities) and assertable in
 * Playwright. Legends and series toggles belong to the parent page — this
 * component just draws whatever series it is handed.
 */

export interface ChartSeries {
  id: string
  label: string
  /** any CSS color, used as the stroke */
  color: string
  points: Pt[]
}

export interface RefLine {
  label: string
  y: number
  tone: 'start' | 'target' | 'limit'
}

interface LineChartProps {
  series: ChartSeries[]
  refLines?: RefLine[]
  /** sparse x-axis labels in data-x coordinates */
  xTicks?: { x: number; label: string }[]
  yFormat?: (v: number) => string
  ariaLabel: string
}

const W = 340
const H = 200
const M = { top: 10, right: 48, bottom: 22, left: 36 }
const PLOT_L = M.left
const PLOT_R = W - M.right
const PLOT_T = M.top
const PLOT_B = H - M.bottom

const REF_LINE: Record<RefLine['tone'], string> = {
  start: 'stroke-zinc-400/70 dark:stroke-zinc-500/70',
  target: 'stroke-emerald-500/80',
  limit: 'stroke-rose-400/80',
}
const REF_LABEL: Record<RefLine['tone'], string> = {
  start: 'fill-zinc-500 dark:fill-zinc-400',
  target: 'fill-emerald-600 dark:fill-emerald-400',
  limit: 'fill-rose-500 dark:fill-rose-400',
}

export function LineChart({
  series,
  refLines = [],
  xTicks = [],
  yFormat = String,
  ariaLabel,
}: LineChartProps) {
  const ys = [
    ...series.flatMap((s) =>
      s.points.filter((p): p is { x: number; y: number } => p.y !== null).map((p) => p.y),
    ),
    ...refLines.map((r) => r.y),
  ]
  const xs = series.flatMap((s) => s.points.map((p) => p.x))
  const yEx = extent(ys)
  const xEx = extent(xs.length > 0 ? xs : xTicks.map((t) => t.x))

  if (yEx === null || xEx === null) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
        No data yet
      </div>
    )
  }

  const pad = (yEx[1] - yEx[0]) * 0.08 || Math.max(Math.abs(yEx[0]) * 0.05, 1)
  const yMin = yEx[0] - pad
  const yMax = yEx[1] + pad
  const [xMin, xMax] = xEx[0] === xEx[1] ? [xEx[0] - 1, xEx[1] + 1] : xEx

  const sx = scale(xMin, xMax, PLOT_L, PLOT_R)
  const sy = scale(yMin, yMax, PLOT_B, PLOT_T)
  const ticks = niceTicks(yMin, yMax, 4).filter((t) => t >= yMin && t <= yMax)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
    >
      <title>{ariaLabel}</title>
      {ticks.map((t) => (
        <g key={`y${t}`}>
          <line
            x1={PLOT_L}
            x2={PLOT_R}
            y1={sy(t)}
            y2={sy(t)}
            strokeWidth={1}
            className="stroke-zinc-100 dark:stroke-zinc-800"
          />
          <text
            x={PLOT_L - 4}
            y={sy(t)}
            dominantBaseline="middle"
            textAnchor="end"
            className="fill-zinc-400 text-[9px] dark:fill-zinc-500"
          >
            {yFormat(t)}
          </text>
        </g>
      ))}

      {refLines.map((r) => (
        <g key={`ref-${r.tone}-${r.label}`}>
          <line
            x1={PLOT_L}
            x2={PLOT_R}
            y1={sy(r.y)}
            y2={sy(r.y)}
            strokeWidth={1}
            strokeDasharray="4 3"
            className={REF_LINE[r.tone]}
          />
          <text
            x={PLOT_R + 3}
            y={sy(r.y)}
            dominantBaseline="middle"
            className={`${REF_LABEL[r.tone]} text-[8px]`}
          >
            {r.label}
          </text>
        </g>
      ))}

      {xTicks.map((t) => (
        <text
          key={`x${t.x}`}
          x={sx(t.x)}
          y={H - 6}
          textAnchor="middle"
          className="fill-zinc-400 text-[9px] dark:fill-zinc-500"
        >
          {t.label}
        </text>
      ))}

      {series.map((s) => (
        <path
          key={s.id}
          d={linePath(s.points, sx, sy)}
          fill="none"
          stroke={s.color}
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}

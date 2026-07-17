import { useRef, useState } from 'react'
import { extent, fillSegments, linePath, nearestX, niceTicks, scale, type Pt } from '@/lib/shared'

/**
 * Presentational multi-series line chart (US-061 / US-063, upgraded in E21).
 * All axis + gap math lives in `@/lib/chart`; this shell maps the computed
 * geometry onto SVG, so it stays theme-aware (Tailwind stroke/fill utilities)
 * and assertable in Playwright. Legends and series toggles belong to the parent
 * page — this component just draws whatever series it is handed.
 *
 * E21 additions: optional point markers (`showDots`, which also makes isolated
 * points between gaps visible — a bare `M` subpath draws nothing), background
 * x-bands (phase shading), and a pointer crosshair that snaps to the nearest
 * logged x and prints each series' value in a read-out row under the plot.
 */

export interface ChartSeries {
  id: string
  label: string
  /** any CSS color, used as the stroke */
  color: string
  points: Pt[]
  /** dashed rendering, e.g. for a derived trend line */
  dashed?: boolean
  /** stroke width override (default 1.75) */
  width?: number
  /** exclude from the crosshair read-out (e.g. a trend of another series) */
  noReadout?: boolean
  /** Plot against the right-hand y-axis (its own scale) instead of the left */
  axis?: 'left' | 'right'
}

export interface RefLine {
  label: string
  y: number
  tone: 'start' | 'target' | 'limit'
}

/** A shaded background span on the x-axis, e.g. a program phase. */
export interface Band {
  x0: number
  x1: number
  label?: string
}

interface LineChartProps {
  series: ChartSeries[]
  refLines?: RefLine[]
  bands?: Band[]
  /** sparse x-axis labels in data-x coordinates */
  xTicks?: { x: number; label: string }[]
  yFormat?: (v: number) => string
  /** crosshair read-out label for a data-x (e.g. the date it stands for) */
  xLabel?: (x: number) => string
  /** draw a marker on every logged point */
  showDots?: boolean
  /** force the y-domain to include zero (for score/volume charts) */
  includeZero?: boolean
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

/** Padded y-domain → pixel scale + nice ticks for one axis; null when no values. */
function axisDomain(values: number[]): { sy: (v: number) => number; ticks: number[] } | null {
  const ex = extent(values)
  if (ex === null) return null
  const pad = (ex[1] - ex[0]) * 0.08 || Math.max(Math.abs(ex[0]) * 0.05, 1)
  const min = ex[0] - pad
  const max = ex[1] + pad
  return {
    sy: scale(min, max, PLOT_B, PLOT_T),
    ticks: niceTicks(min, max, 4).filter((t) => t >= min && t <= max),
  }
}

export function LineChart({
  series,
  refLines = [],
  bands = [],
  xTicks = [],
  yFormat = String,
  xLabel,
  showDots = false,
  includeZero = false,
  ariaLabel,
}: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const seriesValues = (list: ChartSeries[]) =>
    list.flatMap((s) =>
      s.points.filter((p): p is { x: number; y: number } => p.y !== null).map((p) => p.y),
    )
  // Dual-axis: series can opt onto a second (right-hand) y-axis so two series of very
  // different magnitude — e.g. lean (~57 kg) vs fat (~11 kg) mass — each get
  // their own scale and fill the plot instead of one sitting flat against an edge.
  const leftSeries = series.filter((s) => s.axis !== 'right')
  const rightSeries = series.filter((s) => s.axis === 'right')
  const hasRight = rightSeries.length > 0

  const leftYs = [
    ...seriesValues(leftSeries),
    ...refLines.map((r) => r.y),
    ...(includeZero ? [0] : []),
  ]
  const xs = series.flatMap((s) => s.points.map((p) => p.x))
  const leftDom = axisDomain(leftYs)
  const rightDom = hasRight ? axisDomain(seriesValues(rightSeries)) : null
  const xEx = extent(xs.length > 0 ? xs : xTicks.map((t) => t.x))

  if (leftDom === null || xEx === null) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        No data yet
      </div>
    )
  }

  const [xMin, xMax] = xEx[0] === xEx[1] ? [xEx[0] - 1, xEx[1] + 1] : xEx
  const sx = scale(xMin, xMax, PLOT_L, PLOT_R)
  // Left axis is the default; a right-axis series maps through its own scale.
  const sy = leftDom.sy
  const syFor = (s: ChartSeries) => (s.axis === 'right' && rightDom !== null ? rightDom.sy : sy)
  const ticks = leftDom.ticks
  // In dual-axis mode, tint each axis' tick labels with its series' colour so
  // the reader can tell which line each scale belongs to.
  const leftLabelColor = hasRight ? leftSeries[0]?.color : undefined
  const rightLabelColor = rightSeries[0]?.color

  // xs that carry at least one logged value — the crosshair snap targets.
  // Carried-forward fill points (E25) are drawn but never snapped to.
  const loggedXs = [
    ...new Set(
      series.flatMap((s) =>
        s.noReadout
          ? []
          : s.points.filter((p) => p.y !== null && p.filled !== true).map((p) => p.x),
      ),
    ),
  ]

  function pointerX(clientX: number): number | null {
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect === undefined || rect.width === 0) return null
    const px = ((clientX - rect.left) / rect.width) * W
    if (px < PLOT_L - 8 || px > PLOT_R + 8) return null
    return xMin + ((px - PLOT_L) / (PLOT_R - PLOT_L)) * (xMax - xMin)
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const x = pointerX(e.clientX)
    setHoverX(x === null ? null : nearestX(loggedXs, x))
  }

  const readout =
    hoverX === null
      ? null
      : series
          .filter((s) => !s.noReadout)
          .map((s) => ({
            id: s.id,
            label: s.label,
            color: s.color,
            y: s.points.find((p) => p.x === hoverX)?.y ?? null,
          }))
          .filter((r) => r.y !== null)

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHoverX(null)}
        className="touch-pan-y"
      >
        <title>{ariaLabel}</title>

        {bands.map((b, i) =>
          i % 2 === 0 ? null : (
            <rect
              key={`band-${b.x0}`}
              x={sx(Math.max(b.x0, xMin))}
              y={PLOT_T}
              width={Math.max(0, sx(Math.min(b.x1, xMax)) - sx(Math.max(b.x0, xMin)))}
              height={PLOT_B - PLOT_T}
              className="fill-zinc-100/80 dark:fill-zinc-800/50"
            />
          ),
        )}
        {bands.map((b) =>
          b.label === undefined || b.x0 > xMax || b.x1 < xMin ? null : (
            <text
              key={`band-label-${b.x0}`}
              x={(sx(Math.max(b.x0, xMin)) + sx(Math.min(b.x1, xMax))) / 2}
              y={PLOT_T + 8}
              textAnchor="middle"
              className="fill-zinc-400 text-[8px] dark:fill-zinc-500"
            >
              {b.label}
            </text>
          ),
        )}

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
              style={leftLabelColor !== undefined ? { fill: leftLabelColor } : undefined}
            >
              {yFormat(t)}
            </text>
          </g>
        ))}

        {/* Dual-axis: right-hand axis labels (no gridlines — the left axis owns the grid) */}
        {rightDom !== null
          ? rightDom.ticks.map((t) => (
              <text
                key={`yr${t}`}
                x={PLOT_R + 4}
                y={rightDom.sy(t)}
                dominantBaseline="middle"
                textAnchor="start"
                className="text-[9px]"
                style={{ fill: rightLabelColor }}
              >
                {yFormat(t)}
              </text>
            ))
          : null}

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

        {series.map((s) => {
          // E25: a series carrying gap-filled points draws its measured spans
          // solid and its carried-forward (assumed) spans dashed + faded, so a
          // flat "same as last weigh-in" stretch never reads as observed data.
          // Already-dashed series (e.g. the trend overlay) skip the split.
          const syS = syFor(s)
          const carried =
            s.dashed !== true && s.points.some((p) => p.filled === true)
              ? fillSegments(s.points, sx, syS)
              : null
          return (
            <g key={s.id}>
              {carried !== null ? (
                <>
                  <path
                    d={carried.solid}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.width ?? 1.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <path
                    d={carried.carried}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.width ?? 1.75}
                    strokeDasharray="2 3"
                    strokeOpacity={0.55}
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <path
                  d={linePath(s.points, sx, syS)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.width ?? 1.75}
                  strokeDasharray={s.dashed ? '5 3' : undefined}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {showDots
                ? s.points
                    .filter((p): p is { x: number; y: number } => p.y !== null && p.filled !== true)
                    .map((p) => (
                      <circle
                        key={`dot-${s.id}-${p.x}`}
                        cx={sx(p.x)}
                        cy={syS(p.y)}
                        r={2}
                        fill={s.color}
                      />
                    ))
                : null}
            </g>
          )
        })}

        {hoverX !== null ? (
          <g data-testid="crosshair">
            <line
              x1={sx(hoverX)}
              x2={sx(hoverX)}
              y1={PLOT_T}
              y2={PLOT_B}
              strokeWidth={1}
              className="stroke-zinc-400 dark:stroke-zinc-500"
            />
            {series
              .filter((s) => !s.noReadout)
              .map((s) => {
                const y = s.points.find((p) => p.x === hoverX)?.y ?? null
                return y === null ? null : (
                  <circle
                    key={`hover-${s.id}`}
                    cx={sx(hoverX)}
                    cy={syFor(s)(y)}
                    r={3.5}
                    fill={s.color}
                    className="stroke-white stroke-2 dark:stroke-zinc-900"
                  />
                )
              })}
          </g>
        ) : null}
      </svg>

      <div
        className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-0.5 px-1 text-xs text-zinc-600 dark:text-zinc-300"
        aria-live="polite"
      >
        {readout !== null && readout.length > 0 ? (
          <>
            {xLabel !== undefined ? (
              <span className="font-medium text-zinc-500 dark:text-zinc-400">
                {xLabel(hoverX as number)}
              </span>
            ) : null}
            {readout.map((r) => (
              <span key={r.id} className="inline-flex items-center gap-1 tabular-nums">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: r.color }}
                  aria-hidden
                />
                {r.label} {yFormat(r.y as number)}
              </span>
            ))}
          </>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500">
            {loggedXs.length > 0 ? 'Touch the chart to read values' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

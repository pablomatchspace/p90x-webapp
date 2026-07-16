/**
 * Tiny SVG-charting geometry (US-061 / US-063). Pure functions so the axis math
 * and gap handling are unit-tested independently of React — the LineChart
 * component is only a thin presentational shell over these. Hand-rolled on
 * purpose (no chart dependency) to keep the offline bundle small and the SVG
 * DOM assertable in Playwright.
 */

export interface Pt {
  x: number
  /** null marks a gap: the line breaks here instead of interpolating across it */
  y: number | null
  /** E25: carried forward from the last logged value — drawn as line, never as a marker */
  filled?: boolean
}

/** Min/max over the finite values, or null when there are none. */
export function extent(values: number[]): [number, number] | null {
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  return min === Infinity ? null : [min, max]
}

/**
 * "Nice" evenly-spaced tick values covering [min, max] with roughly `count`
 * steps, each step snapped to 1/2/5/10×10ⁿ (the classic d3 nice-number rule).
 * Returns [min] when the range is a single point.
 */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (min === max) return [min]
  const rawStep = (max - min) / Math.max(1, count)
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const norm = rawStep / mag
  const nice = norm >= 7.07 ? 10 : norm >= 3.16 ? 5 : norm >= 1.41 ? 2 : 1
  const step = nice * mag
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let t = start; t <= max + step / 1e6; t += step) {
    // snap each tick back onto the clean grid to shed floating-point drift
    ticks.push(Math.round(t / step) * step)
  }
  return ticks
}

/** Linear interpolator from a data domain to a pixel range. */
export function scale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): (v: number) => number {
  const span = domainMax - domainMin
  return (v) =>
    span === 0
      ? (rangeMin + rangeMax) / 2
      : rangeMin + ((v - domainMin) / span) * (rangeMax - rangeMin)
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Trailing moving average over the logged points (E21). For each point with a
 * value, the average of every value whose x lies in the window (x−window, x].
 * Null gaps are skipped entirely — the trend line flows THROUGH missing days
 * (that is its job), so the result contains only non-null points.
 */
export function movingAverage(points: Pt[], window: number): Pt[] {
  const logged = points.filter((p): p is { x: number; y: number } => p.y !== null)
  return logged.map((p) => {
    const inWindow = logged.filter((q) => q.x <= p.x && q.x > p.x - window)
    const sum = inWindow.reduce((acc, q) => acc + q.y, 0)
    return { x: p.x, y: sum / inWindow.length }
  })
}

/**
 * Carry-forward gap fill (E25): every null after the first logged value becomes
 * a copy of the last logged value, flagged `filled` so the chart draws one
 * unbroken line without minting markers or crosshair stops for days that were
 * never measured. Leading nulls (before the first log) stay gaps.
 */
export function fillForward(points: Pt[]): Pt[] {
  let last: number | null = null
  return points.map((p) => {
    if (p.y !== null) {
      last = p.y
      return p
    }
    return last === null ? p : { x: p.x, y: last, filled: true }
  })
}

/** The x closest to `x` (ties go to the earlier value); null for an empty list. */
export function nearestX(xs: number[], x: number): number | null {
  let best: number | null = null
  for (const candidate of xs) {
    if (best === null || Math.abs(candidate - x) < Math.abs(best - x)) best = candidate
  }
  return best
}

/**
 * SVG path for a polyline through the points, breaking into separate subpaths
 * wherever y is null (a missing-day gap) so the line never interpolates across
 * absent data. `sx`/`sy` map data coordinates to pixels.
 */
export function linePath(
  points: Pt[],
  sx: (x: number) => number,
  sy: (y: number) => number,
): string {
  let d = ''
  let penDown = false
  for (const p of points) {
    if (p.y === null) {
      penDown = false
      continue
    }
    d += `${penDown ? 'L' : 'M'}${round(sx(p.x))} ${round(sy(p.y))} `
    penDown = true
  }
  return d.trim()
}

/**
 * Split a gap-filled point list (E25) into two SVG subpath strings so the chart
 * can draw measured spans solid and carried-forward spans dashed. A segment
 * between adjacent points is "carried" (assumed, not measured) when either
 * endpoint was filled forward; both-real segments are "solid". Null gaps break
 * both. Each segment is emitted as its own `M…L…` so the two styles interleave
 * cleanly along the same line. Series with no `filled` points yield an empty
 * `carried` string, so the caller can fall back to a plain continuous line.
 */
export function fillSegments(
  points: Pt[],
  sx: (x: number) => number,
  sy: (y: number) => number,
): { solid: string; carried: string } {
  let solid = ''
  let carried = ''
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (a.y === null || b.y === null) continue
    const seg = `M${round(sx(a.x))} ${round(sy(a.y))} L${round(sx(b.x))} ${round(sy(b.y))} `
    if (a.filled === true || b.filled === true) carried += seg
    else solid += seg
  }
  return { solid: solid.trim(), carried: carried.trim() }
}

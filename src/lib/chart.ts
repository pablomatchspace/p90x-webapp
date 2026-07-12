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

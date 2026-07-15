import { describe, expect, it } from 'vitest'
import {
  extent,
  fillForward,
  fillSegments,
  linePath,
  movingAverage,
  nearestX,
  niceTicks,
  scale,
} from './chart'

describe('extent', () => {
  it('finds min/max over finite values', () => {
    expect(extent([3, 1, 2])).toEqual([1, 3])
    expect(extent([5])).toEqual([5, 5])
    expect(extent([Number.NaN, 2, Number.POSITIVE_INFINITY, 4])).toEqual([2, 4])
    expect(extent([])).toBeNull()
  })
})

describe('niceTicks', () => {
  it('snaps to clean 1/2/5 steps', () => {
    expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100])
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10])
    expect(niceTicks(80, 82, 5)).toEqual([80, 80.5, 81, 81.5, 82])
  })

  it('collapses a degenerate range to a single tick', () => {
    expect(niceTicks(5, 5)).toEqual([5])
  })
})

describe('scale', () => {
  it('maps a domain onto a pixel range linearly', () => {
    const s = scale(0, 10, 0, 100)
    expect(s(0)).toBe(0)
    expect(s(5)).toBe(50)
    expect(s(10)).toBe(100)
  })

  it('centers a zero-width domain instead of dividing by zero', () => {
    expect(scale(5, 5, 0, 100)(5)).toBe(50)
  })
})

describe('linePath', () => {
  it('draws a continuous polyline', () => {
    const path = linePath(
      [
        { x: 0, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 3 },
      ],
      (x) => x,
      (y) => y,
    )
    expect(path).toBe('M0 1 L1 2 L2 3')
  })

  it('breaks the line at null-y gaps instead of interpolating across them', () => {
    const path = linePath(
      [
        { x: 0, y: 1 },
        { x: 1, y: null },
        { x: 2, y: 3 },
        { x: 3, y: 4 },
      ],
      (x) => x,
      (y) => y,
    )
    expect(path).toBe('M0 1 M2 3 L3 4')
  })
})

describe('movingAverage', () => {
  it('averages the values inside the trailing x-window', () => {
    const ma = movingAverage(
      [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
        { x: 2, y: 30 },
      ],
      2,
    )
    expect(ma).toEqual([
      { x: 0, y: 10 },
      { x: 1, y: 15 },
      { x: 2, y: 25 },
    ])
  })

  it('flows through null gaps — the window is by x-distance, not index', () => {
    const ma = movingAverage(
      [
        { x: 0, y: 10 },
        { x: 1, y: null },
        { x: 2, y: null },
        { x: 3, y: 30 },
      ],
      7,
    )
    // the gap days are dropped, and x=0 is still inside x=3's 7-wide window
    expect(ma).toEqual([
      { x: 0, y: 10 },
      { x: 3, y: 20 },
    ])
  })

  it('returns empty for all-null input', () => {
    expect(movingAverage([{ x: 0, y: null }], 7)).toEqual([])
  })
})

describe('fillForward', () => {
  it('carries the last logged value across null gaps, flagged as filled', () => {
    expect(
      fillForward([
        { x: 0, y: 10 },
        { x: 1, y: null },
        { x: 2, y: null },
        { x: 3, y: 30 },
      ]),
    ).toEqual([
      { x: 0, y: 10 },
      { x: 1, y: 10, filled: true },
      { x: 2, y: 10, filled: true },
      { x: 3, y: 30 },
    ])
  })

  it('leaves leading nulls (before the first log) as gaps', () => {
    expect(
      fillForward([
        { x: 0, y: null },
        { x: 1, y: 5 },
        { x: 2, y: null },
      ]),
    ).toEqual([
      { x: 0, y: null },
      { x: 1, y: 5 },
      { x: 2, y: 5, filled: true },
    ])
  })

  it('is the identity for fully-logged input', () => {
    const points = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
    ]
    expect(fillForward(points)).toEqual(points)
  })
})

describe('fillSegments', () => {
  const id = (n: number) => n

  it('draws measured spans solid and carried-forward spans dashed', () => {
    const { solid, carried } = fillSegments(
      fillForward([
        { x: 0, y: 10 },
        { x: 1, y: null },
        { x: 2, y: 30 },
        { x: 3, y: 40 },
      ]),
      id,
      id,
    )
    // 0→1 and 1→2 touch the filled x=1 point → carried; 2→3 is real→real → solid
    expect(carried).toBe('M0 10 L1 10 M1 10 L2 30')
    expect(solid).toBe('M2 30 L3 40')
  })

  it('breaks both paths across null gaps and yields no carried spans when nothing was filled', () => {
    const { solid, carried } = fillSegments(
      [
        { x: 0, y: 10 },
        { x: 1, y: null },
        { x: 2, y: 30 },
      ],
      id,
      id,
    )
    expect(carried).toBe('')
    expect(solid).toBe('') // the only adjacent pair straddles the gap
  })
})

describe('nearestX', () => {
  it('snaps to the closest x, preferring the earlier value on ties', () => {
    expect(nearestX([0, 3, 10], 4)).toBe(3)
    expect(nearestX([0, 2, 4], 3)).toBe(2)
    expect(nearestX([], 1)).toBeNull()
  })
})

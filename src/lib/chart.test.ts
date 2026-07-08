import { describe, expect, it } from 'vitest'
import { extent, linePath, niceTicks, scale } from './chart'

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

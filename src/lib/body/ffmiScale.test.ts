import { describe, expect, it } from 'vitest'
import { bodyFraction, kg, meters } from '@/lib/shared'
import type { BodyEntry, Settings } from '@/lib/shared'
import { FFMI_BANDS, FFMI_SCALE, ffmiBand, ffmiScalePosition, ffmiSummary } from './ffmiScale'

function entry(date: string, weight: number | null, bodyFat: number | null): BodyEntry {
  return {
    date,
    weight: weight === null ? null : kg(weight),
    bodyFat: bodyFat === null ? null : bodyFraction(bodyFat),
    water: null,
    bone: null,
    zoneMinutes: null,
  }
}

type SummarySettings = Pick<Settings, 'height' | 'startWeight' | 'startBodyFat' | 'targets'>

function settings(over: Partial<SummarySettings> = {}): SummarySettings {
  return {
    height: meters(1.65),
    startWeight: kg(68),
    startBodyFat: bodyFraction(0.2),
    targets: { leanMassIncrease: null, bodyFat: null, ffmi: null },
    ...over,
  } as SummarySettings
}

describe('ffmiBand — sourced anchors on the Kouri-normalized scale', () => {
  it('puts the ESPEN low-FFMI cut-off (17) at the Low / Below-average edge', () => {
    expect(ffmiBand(16.99).key).toBe('low')
    expect(ffmiBand(17).key).toBe('below')
  })

  it('puts the adult-male population median (~19) at the Below / Above-average edge', () => {
    expect(ffmiBand(18.99).key).toBe('below')
    expect(ffmiBand(19).key).toBe('above')
  })

  it('starts the athletic band at the top-decile adult level (21)', () => {
    expect(ffmiBand(20.99).key).toBe('above')
    expect(ffmiBand(21).key).toBe('athletic')
  })

  it('ends the athletic band at the Kouri non-user limit (25)', () => {
    expect(ffmiBand(24.99).key).toBe('athletic')
    expect(ffmiBand(25).key).toBe('beyond')
  })

  it('words the top band as "above the usual natural range", never an accusation', () => {
    expect(ffmiBand(26).label).toBe('Above the usual natural range')
  })

  it('has contiguous, ascending bands covering the whole scale', () => {
    expect(FFMI_BANDS[0].from).toBe(-Infinity)
    for (let i = 1; i < FFMI_BANDS.length; i++) {
      expect(FFMI_BANDS[i].from).toBeGreaterThan(FFMI_BANDS[i - 1].from)
    }
    expect(FFMI_BANDS.every((b) => b.source.length > 0)).toBe(true)
  })
})

describe('ffmiScalePosition', () => {
  it('maps the display range onto 0–1 and clamps outside it', () => {
    expect(ffmiScalePosition(FFMI_SCALE.min)).toBe(0)
    expect(ffmiScalePosition(FFMI_SCALE.max)).toBe(1)
    expect(ffmiScalePosition(FFMI_SCALE.min - 5)).toBe(0)
    expect(ffmiScalePosition(FFMI_SCALE.max + 5)).toBe(1)
    expect(ffmiScalePosition((FFMI_SCALE.min + FFMI_SCALE.max) / 2)).toBeCloseTo(0.5, 10)
  })
})

describe('ffmiSummary — start vs current body stats', () => {
  it('derives start FFMI from the start stats and current FFMI from the latest complete weigh-in', () => {
    const s = ffmiSummary(settings(), [
      entry('2026-01-01', 67, 0.19),
      entry('2026-02-01', 69, 0.17),
      entry('2026-02-02', null, null), // incomplete — skipped
    ])
    // start: 68 × 0.8 = 54.4 kg lean; current: 69 × 0.83 = 57.27 kg lean; both at 1.65 m
    expect(s.start).toBeCloseTo(54.4 / 1.65 ** 2 + 6.1 * (1.8 - 1.65), 6)
    expect(s.current).toBeCloseTo(57.27 / 1.65 ** 2 + 6.1 * (1.8 - 1.65), 6)
    expect(s.currentDate).toBe('2026-02-01')
    expect(s.change).toBeCloseTo((s.current as number) - (s.start as number), 10)
  })

  it('reports the band of the current value', () => {
    const s = ffmiSummary(settings(), [entry('2026-02-01', 69, 0.17)])
    expect(s.band?.key).toBe('athletic') // ≈ 21.96
  })

  it('computes progress from start to the FFMI target, uncapped', () => {
    const base = ffmiSummary(settings(), [entry('2026-02-01', 69, 0.17)])
    const target = (base.start as number) + 2 * ((base.current as number) - (base.start as number))
    const s = ffmiSummary(
      settings({ targets: { leanMassIncrease: null, bodyFat: null, ffmi: target } }),
      [entry('2026-02-01', 69, 0.17)],
    )
    expect(s.target).toBeCloseTo(target, 10)
    expect(s.progressPct).toBe(50)
  })

  it('has null progress when the target equals the start, and null target when unset', () => {
    const s = ffmiSummary(settings(), [entry('2026-02-01', 69, 0.17)])
    expect(s.target).toBeNull()
    expect(s.progressPct).toBeNull()
    const start = s.start as number
    const same = ffmiSummary(
      settings({ targets: { leanMassIncrease: null, bodyFat: null, ffmi: start } }),
      [entry('2026-02-01', 69, 0.17)],
    )
    expect(same.progressPct).toBeNull()
  })

  it('falls back gracefully: no height → everything null; no log → current null but start kept', () => {
    const noHeight = ffmiSummary(settings({ height: null }), [entry('2026-02-01', 69, 0.17)])
    expect([noHeight.start, noHeight.current, noHeight.change, noHeight.band]).toEqual([
      null,
      null,
      null,
      null,
    ])
    const noLog = ffmiSummary(settings(), [])
    expect(noLog.start).not.toBeNull()
    expect(noLog.current).toBeNull()
    expect(noLog.change).toBeNull()
  })
})

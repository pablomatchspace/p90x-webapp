import { describe, expect, it } from 'vitest'
import { bodyFraction, emptyState, kg, meters } from '@/lib/shared'
import { applySnapshot, buildArchivedRound, defaultRoundLabel, latestStartStats } from './archive'

/**
 * Round-archive invariants (E28 US-143), extracted from the application
 * layer: the archive freezes raw inputs + the round-scoped SETUP snapshot so
 * reports recompute history exactly, whatever later Settings changes do.
 */

function liveDoc() {
  const doc = emptyState()
  doc.settings.startDate = '2026-01-05'
  doc.settings.program = 'lean'
  doc.settings.age = 40
  doc.settings.height = meters(1.8)
  doc.settings.startWeight = kg(82)
  doc.bodyLog.push(
    {
      date: '2026-01-06',
      weight: kg(81),
      bodyFat: null,
      water: null,
      bone: null,
      zoneMinutes: null,
    },
    {
      date: '2026-01-07',
      weight: null,
      bodyFat: bodyFraction(0.2),
      water: null,
      bone: null,
      zoneMinutes: null,
    },
  )
  return doc
}

describe('defaultRoundLabel', () => {
  it('numbers from the existing archive size', () => {
    expect(defaultRoundLabel(0)).toBe('Round 1')
    expect(defaultRoundLabel(2)).toBe('Round 3')
  })
})

describe('buildArchivedRound', () => {
  it('freezes program, ops, logs and the SETUP snapshot', () => {
    const doc = liveDoc()
    const round = buildArchivedRound(doc, {
      id: 'r1',
      archivedAt: '2026-04-05T00:00:00.000Z',
      label: 'Round 1',
    })
    expect(round).toMatchObject({
      id: 'r1',
      label: 'Round 1',
      program: 'lean',
      startDate: '2026-01-05',
    })
    expect(round.bodyLog).toHaveLength(2)
    expect(round.snapshot).toMatchObject({ age: 40, height: 1.8, startWeight: 82 })
  })
})

describe('latestStartStats', () => {
  it('picks the latest weigh-in independently per stat', () => {
    expect(latestStartStats(liveDoc().bodyLog)).toEqual({
      startWeight: kg(81),
      startBodyFat: bodyFraction(0.2),
    })
  })

  it('reports nothing from an empty log', () => {
    expect(latestStartStats([])).toEqual({})
  })
})

describe('applySnapshot', () => {
  it('writes the archived SETUP inputs back to settings', () => {
    const doc = liveDoc()
    const round = buildArchivedRound(doc, { id: 'r1', archivedAt: 't', label: 'L' })
    const settings = emptyState().settings
    applySnapshot(settings, round)
    expect(settings).toMatchObject({
      program: 'lean',
      startDate: '2026-01-05',
      age: 40,
      height: 1.8,
      startWeight: 82,
    })
  })
})

import { describe, expect, it } from 'vitest'
import { migrateToCurrent } from './migrations'
import { emptyState, SCHEMA_VERSION } from './schema'

/** A faithful document at an older version: current empty state minus later fields. */
function docAt(version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10): Record<string, unknown> {
  const doc = JSON.parse(JSON.stringify(emptyState())) as {
    schemaVersion: number
    rounds?: unknown
    settings: {
      timer?: unknown
      targets: Record<string, unknown>
      player?: Record<string, unknown>
      yoga?: unknown
      training?: unknown
      nutrition?: Record<string, unknown>
      workoutLinks?: unknown
    }
  }
  doc.schemaVersion = version
  if (version < 11) delete doc.rounds // v11 field
  if (version < 10) delete doc.settings.player?.voiceCues // v10 field
  if (version < 9) delete doc.settings.nutrition?.dietStyle // v9 field
  if (version < 8) delete doc.settings.workoutLinks // v8 field
  if (version < 7) delete doc.settings.nutrition // v7 field
  if (version < 6) delete doc.settings.training // v6 field
  if (version < 5) delete doc.settings.yoga // v5 field
  if (version < 4) delete doc.settings.player // v4 field
  if (version < 3) delete doc.settings.targets.ffmi // v3 field
  if (version < 2) delete doc.settings.timer // v2 field
  return doc
}

describe('migration pipeline', () => {
  it('upgrades a v1 document through every step', () => {
    const result = migrateToCurrent(docAt(1))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.schemaVersion).toBe(SCHEMA_VERSION)
      expect(result.state.settings.timer).toEqual({ workSeconds: 60, restSeconds: 60 })
      expect(result.state.settings.targets.ffmi).toBeNull()
      expect(result.state.settings.player).toEqual({ autoMarkDone: false, voiceCues: true })
      expect(result.state.settings.yoga).toBe('classic')
      expect(result.state.settings.training).toBe('intermediate')
      expect(result.state.settings.nutrition).toEqual({
        phaseOverride: null,
        calorieOverride: null,
        dietStyle: 'balanced',
      })
      expect(result.state.settings.workoutLinks).toEqual({})
    }
  })

  it('upgrades a v2 document, keeping its timer and adding the ffmi target', () => {
    const doc = docAt(2)
    ;(doc.settings as { timer?: unknown }).timer = { workSeconds: 45, restSeconds: 90 }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.timer).toEqual({ workSeconds: 45, restSeconds: 90 })
      expect(result.state.settings.targets.ffmi).toBeNull()
      expect(result.state.settings.player).toEqual({ autoMarkDone: false, voiceCues: true })
      expect(result.state.settings.yoga).toBe('classic')
    }
  })

  it('upgrades a v3 document, keeping custom timer/ffmi values and gaining player', () => {
    const doc = docAt(3)
    ;(doc.settings as { timer?: unknown }).timer = { workSeconds: 45, restSeconds: 90 }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.timer).toEqual({ workSeconds: 45, restSeconds: 90 })
      expect(result.state.settings.targets.ffmi).toBeNull()
      expect(result.state.settings.player).toEqual({ autoMarkDone: false, voiceCues: true })
      expect(result.state.settings.yoga).toBe('classic')
    }
  })

  it('upgrades a v4 document, keeping custom player values and gaining yoga', () => {
    const doc = docAt(4)
    ;(doc.settings as { player?: unknown }).player = { autoMarkDone: true }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.player).toEqual({ autoMarkDone: true, voiceCues: true })
      expect(result.state.settings.yoga).toBe('classic')
    }
  })

  it('upgrades a v5 document, keeping yoga and gaining training experience', () => {
    const doc = docAt(5)
    ;(doc.settings as { yoga?: unknown }).yoga = 'x3'
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.yoga).toBe('x3')
      expect(result.state.settings.training).toBe('intermediate')
      expect(result.state.settings.workoutLinks).toEqual({})
    }
  })

  it('upgrades a v7 document, keeping nutrition overrides and gaining empty workout links', () => {
    const doc = docAt(7)
    ;(doc.settings as { nutrition?: unknown }).nutrition = {
      phaseOverride: 2,
      calorieOverride: 2600,
    }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.nutrition).toEqual({
        phaseOverride: 2,
        calorieOverride: 2600,
        dietStyle: 'balanced',
      })
      expect(result.state.settings.workoutLinks).toEqual({})
    }
  })

  it('upgrades a v6 document, keeping training and gaining nutrition overrides', () => {
    const doc = docAt(6)
    ;(doc.settings as { training?: unknown }).training = 'advanced'
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.training).toBe('advanced')
      expect(result.state.settings.nutrition).toEqual({
        phaseOverride: null,
        calorieOverride: null,
        dietStyle: 'balanced',
      })
    }
  })

  it('upgrades a v8 document, keeping workout links and gaining the diet style', () => {
    const doc = docAt(8)
    ;(doc.settings as { nutrition?: unknown }).nutrition = {
      phaseOverride: 2,
      calorieOverride: 2100,
    }
    ;(doc.settings as { workoutLinks?: unknown }).workoutLinks = {
      'chest-back': { video: 'https://example.com/v' },
    }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.nutrition).toEqual({
        phaseOverride: 2,
        calorieOverride: 2100,
        dietStyle: 'balanced',
      })
      expect(result.state.settings.workoutLinks).toEqual({
        'chest-back': { video: 'https://example.com/v' },
      })
    }
  })

  it('upgrades a v9 document, keeping player prefs and gaining voice cues on', () => {
    const doc = docAt(9)
    ;(doc.settings as { player?: unknown }).player = { autoMarkDone: true }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.player).toEqual({ autoMarkDone: true, voiceCues: true })
      expect(result.state.rounds).toEqual([])
    }
  })

  it('upgrades a v10 document, gaining an empty archived-rounds list', () => {
    const result = migrateToCurrent(docAt(10))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.rounds).toEqual([])
    }
  })

  it('never mutates the caller’s document', () => {
    const doc = docAt(1)
    migrateToCurrent(doc)
    expect(doc.schemaVersion).toBe(1)
  })

  it('passes a current document through unmigrated', () => {
    expect(migrateToCurrent(emptyState())).toMatchObject({ ok: true, migrated: false })
  })

  it('still rejects v0 and newer-than-current versions', () => {
    expect(migrateToCurrent({ schemaVersion: 0 }).ok).toBe(false)
    expect(migrateToCurrent({ schemaVersion: SCHEMA_VERSION + 1 }).ok).toBe(false)
  })
})

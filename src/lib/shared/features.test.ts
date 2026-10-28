import { describe, expect, it } from 'vitest'
import { FEATURES, FEATURE_KEYS, applyFeatureToggle, isFeatureEnabled } from './features'

describe('feature catalog', () => {
  it('has one catalog entry per key, with a title and description', () => {
    expect(FEATURES.map((f) => f.key)).toEqual([...FEATURE_KEYS])
    for (const f of FEATURES) {
      expect(f.title.length).toBeGreaterThan(0)
      expect(f.description.length).toBeGreaterThan(0)
    }
  })

  it('has unique keys', () => {
    expect(new Set(FEATURE_KEYS).size).toBe(FEATURE_KEYS.length)
  })

  it('covers the 13 agreed switchable features and nothing core', () => {
    expect([...FEATURE_KEYS].sort()).toEqual(
      [
        'adherence',
        'audio',
        'calculators',
        'ffmi',
        'gear',
        'notes',
        'nutrition',
        'overload',
        'quotes',
        'restTimer',
        'trends',
        'voiceEntry',
        'workoutLinks',
      ].sort(),
    )
  })

  it('groups every feature as a section, an in-screen card or a player behaviour', () => {
    for (const f of FEATURES) expect(['sections', 'cards', 'player']).toContain(f.group)
  })
})

describe('isFeatureEnabled', () => {
  it('is on for everything when nothing is disabled (the upgrade default)', () => {
    for (const key of FEATURE_KEYS)
      expect(isFeatureEnabled({ disabledFeatures: [] }, key)).toBe(true)
  })

  it('is off only for the listed keys', () => {
    const settings = { disabledFeatures: ['notes', 'ffmi'] as const }
    expect(isFeatureEnabled({ disabledFeatures: [...settings.disabledFeatures] }, 'notes')).toBe(
      false,
    )
    expect(isFeatureEnabled({ disabledFeatures: [...settings.disabledFeatures] }, 'ffmi')).toBe(
      false,
    )
    expect(isFeatureEnabled({ disabledFeatures: [...settings.disabledFeatures] }, 'quotes')).toBe(
      true,
    )
  })
})

describe('applyFeatureToggle', () => {
  it('disables a feature by adding it to the list, once', () => {
    let list = applyFeatureToggle([], 'notes', false)
    list = applyFeatureToggle(list, 'notes', false)
    expect(list).toEqual(['notes'])
  })

  it('re-enables a feature by removing it', () => {
    expect(applyFeatureToggle(['notes', 'ffmi'], 'notes', true)).toEqual(['ffmi'])
  })

  it('is a no-op for enabling an already-enabled feature', () => {
    expect(applyFeatureToggle(['ffmi'], 'notes', true)).toEqual(['ffmi'])
  })

  it('keeps the list in catalog order so equal choices serialise identically', () => {
    const list = applyFeatureToggle(applyFeatureToggle([], 'voiceEntry', false), 'restTimer', false)
    expect(list).toEqual(['restTimer', 'voiceEntry'])
  })

  it('does not mutate its input', () => {
    const input = ['notes'] as const
    const copy = [...input]
    applyFeatureToggle(copy, 'ffmi', false)
    expect(copy).toEqual(['notes'])
  })
})

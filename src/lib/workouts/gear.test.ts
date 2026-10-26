import { describe, expect, it } from 'vitest'
import { workoutsFor } from '@/lib/shared'
import { findGear, gearFor, gearForWorkouts, gearLabel, GEAR_LABELS, type GearId } from './gear'

const everyKey = [...new Set([...workoutsFor('p90x'), ...workoutsFor('gennext')].map((w) => w.key))]

describe('gearFor', () => {
  it('has an entry for every workout of every suite (new workouts cannot ship without one)', () => {
    for (const key of everyKey) expect(() => gearFor(key), key).not.toThrow()
  })

  it('only uses gear that has a label', () => {
    for (const key of everyKey) {
      for (const id of gearFor(key)) expect(GEAR_LABELS[id], `${key}:${id}`).toBeTruthy()
    }
  })

  it('lists the pull-up bar for Back & Biceps and Generation Next Pull Strength', () => {
    expect(gearFor('back-biceps')).toContain('pull-up-bar')
    expect(gearFor('gn-pull-strength')).toContain('pull-up-bar')
  })

  it('needs no gear for Kenpo X, Cardio Boxing and rest days', () => {
    expect(gearFor('kenpo-x')).toEqual([])
    expect(gearFor('gn-cardio-boxing')).toEqual([])
    expect(gearFor('rest')).toEqual([])
  })

  it('reads Generation Next gear from the requirements doc (foam roller, bench)', () => {
    expect(gearFor('gn-active-flexibility')).toContain('foam-roller')
    expect(gearFor('gn-bonus-shoulders')).toEqual(['dumbbells', 'bench'])
  })

  it('throws for an unknown workout key', () => {
    expect(() => gearFor('nope')).toThrow()
  })
})

describe('gearForWorkouts', () => {
  it('unions gear across workouts in vocabulary order without duplicates', () => {
    const ids: GearId[] = gearForWorkouts(['back-biceps', 'chest-back', 'ab-ripper-x'])
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining(['pull-up-bar', 'dumbbells', 'mat']))
    expect(ids).toEqual(Object.keys(GEAR_LABELS).filter((id) => ids.includes(id as GearId)))
  })

  it('skips a key with no entry instead of throwing', () => {
    expect(findGear('nope')).toBeNull()
    expect(gearForWorkouts(['nope', 'ab-ripper-x'])).toEqual(['mat'])
  })

  it('is empty when no workout needs gear', () => {
    expect(gearForWorkouts(['rest', 'kenpo-x'])).toEqual([])
  })
})

describe('gearLabel', () => {
  it('returns the human label', () => {
    expect(gearLabel('pull-up-bar')).toBe('Pull-up bar')
  })
})

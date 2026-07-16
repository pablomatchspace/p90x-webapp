import { describe, expect, it } from 'vitest'
import { bodyFraction, bodyFractionSchema, kg, kgSchema, meters, metersSchema } from './units'

/**
 * Branded unit value objects for the document's canonical metric storage
 * (meters / kg / fraction 0–1). The brand is compile-time only: constructors
 * are pure casts (identical runtime behavior to the unbranded code they
 * replace), and validation stays at the zod parse boundary, whose `.finite()`
 * rule is unchanged — no existing document changes validity.
 */

describe('unit constructors', () => {
  it('kg brands the value without changing it', () => {
    expect(kg(80.5)).toBe(80.5)
  })

  it('meters brands the value without changing it', () => {
    expect(meters(1.8)).toBe(1.8)
  })

  it('bodyFraction brands the value without changing it', () => {
    expect(bodyFraction(0.212)).toBe(0.212)
  })
})

describe('unit zod schemas', () => {
  it('parse finite numbers unchanged', () => {
    expect(kgSchema.parse(72)).toBe(72)
    expect(metersSchema.parse(1.75)).toBe(1.75)
    expect(bodyFractionSchema.parse(0.5)).toBe(0.5)
  })

  it('reject non-finite numbers, exactly like the unbranded fields did', () => {
    expect(() => kgSchema.parse(Number.POSITIVE_INFINITY)).toThrow()
    expect(() => metersSchema.parse(Number.NaN)).toThrow()
    expect(() => bodyFractionSchema.parse(Number.NaN)).toThrow()
  })
})

import { z } from 'zod'

/**
 * Branded value objects for the canonical metric storage units
 * (docs/GLOSSARY.md: meters / kg / fraction 0–1). The brand exists only at the
 * type level: constructors are pure casts, so runtime behavior is identical to
 * the unbranded numbers they replace, and validation stays at the zod parse
 * boundary (`.finite()`, unchanged). Construct at the conversion boundary
 * (`unitToKg`, `unitToM`, `percentToFraction` in `@/lib/body`, or these
 * constructors in tests/migrations); arithmetic on a branded value is free
 * since `Kg extends number`.
 */

export const kgSchema = z.number().finite().brand<'Kg'>()
export const metersSchema = z.number().finite().brand<'Meters'>()
/** A 0–1 fraction of body composition: body fat, water, bone. */
export const bodyFractionSchema = z.number().finite().brand<'BodyFraction'>()

export type Kg = z.infer<typeof kgSchema>
export type Meters = z.infer<typeof metersSchema>
export type BodyFraction = z.infer<typeof bodyFractionSchema>

export function kg(value: number): Kg {
  return value as Kg
}

export function meters(value: number): Meters {
  return value as Meters
}

export function bodyFraction(value: number): BodyFraction {
  return value as BodyFraction
}

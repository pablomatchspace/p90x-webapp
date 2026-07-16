import type { Settings } from '@/lib/shared'

/**
 * Body-fat estimators (US-072) — transcribed verbatim from the workbook's
 * CALCULATORS sheet so the app reproduces its numbers exactly. Every method
 * returns a body-fat FRACTION (0–1), the same shape the sheet and our settings
 * store, or null when an input is missing / out of domain.
 *
 * Coefficients are copied as the sheet writes them, including its deliberate
 * quirks (e.g. the 3-site male age term is 0.000257, the sheet's truncation of
 * the textbook 0.0002574) — parity with the oracle beats textbook tidiness.
 */

export type Sex = Settings['gender'] // 'male' | 'female'
export type LengthUnit = 'cm' | 'in'

const log10 = (x: number) => Math.log10(x)

/**
 * OPTION 2 — U.S. Navy circumference method (CALCULATORS!C20). Circumferences and
 * height are entered in `unit`; the sheet converts inches to cm (×2.54) before the
 * log terms. Male uses abdomen−neck, female uses abdomen+hip−neck. Null when a
 * required input is missing or a log argument would be ≤ 0.
 */
export function navyBodyFat(input: {
  sex: Sex
  abdomen: number | null
  neck: number | null
  hip: number | null
  height: number | null
  unit: LengthUnit
}): number | null {
  const { sex, abdomen, neck, hip, height, unit } = input
  if (abdomen === null || neck === null || height === null) return null
  if (sex === 'female' && hip === null) return null

  const k = unit === 'in' ? 2.54 : 1
  const h = height * k
  if (h <= 0) return null

  if (sex === 'male') {
    const girth = (abdomen - neck) * k
    if (girth <= 0) return null
    return 4.95 / (1.0324 - 0.19077 * log10(girth) + 0.15456 * log10(h)) - 4.5
  }
  const girth = (abdomen + (hip as number) - neck) * k
  if (girth <= 0) return null
  return 4.95 / (1.29579 - 0.35004 * log10(girth) + 0.221 * log10(h)) - 4.5
}

/** Jackson–Pollock body density → Brozek fraction, exactly as the sheet writes it. */
function brozek(density: number): number {
  return 4.57 / density - 4.142
}

/** Site labels in the sheet's own order (used by the calculator UI). */
export const THREE_SITE_SITES: Record<Sex, string[]> = {
  male: ['Chest', 'Abdomen', 'Thigh'],
  female: ['Tricep', 'Suprailiac', 'Thigh'],
}

export const SEVEN_SITE_SITES: Record<Sex, string[]> = {
  male: ['Chest', 'Abdomen', 'Thigh', 'Suprailiac', 'Midaxillary', 'Tricep', 'Subscapula'],
  female: ['Tricep', 'Suprailiac', 'Thigh', 'Chest', 'Midaxillary', 'Subscapula', 'Abdomen'],
}

/**
 * OPTION 3 — 3-site skinfold (CALCULATORS!F29/M29). `sites` are skinfolds in mm in
 * the order of THREE_SITE_SITES[sex]; only their sum matters. Null unless all
 * three sites and the age are present.
 */
export function threeSiteBodyFat(input: {
  sex: Sex
  sites: (number | null)[]
  age: number | null
}): number | null {
  const { sex, sites, age } = input
  if (age === null || sites.length !== 3 || sites.some((s) => s === null)) return null
  const sum = (sites as number[]).reduce((a, b) => a + b, 0)
  const density =
    sex === 'male'
      ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.000257 * age
      : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum ** 2 - 0.0001392 * age
  return brozek(density)
}

/**
 * OPTION 4 — 7-site skinfold (CALCULATORS!F44/M44). `sites` are skinfolds in mm in
 * the order of SEVEN_SITE_SITES[sex]; only their sum matters. Null unless all seven
 * sites and the age are present.
 */
export function sevenSiteBodyFat(input: {
  sex: Sex
  sites: (number | null)[]
  age: number | null
}): number | null {
  const { sex, sites, age } = input
  if (age === null || sites.length !== 7 || sites.some((s) => s === null)) return null
  const sum = (sites as number[]).reduce((a, b) => a + b, 0)
  const density =
    sex === 'male'
      ? 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * age
      : 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * age
  return brozek(density)
}

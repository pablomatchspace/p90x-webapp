import type { BodyEntry } from '@/lib/shared'
import { compareISO, type ISODate } from '@/lib/shared'

/**
 * Body-log invariants (US-050). Operate on the bodyLog slice (immer draft or
 * plain array): one scale entry per date, created lazily, kept sorted
 * ascending, and removed again when every field is cleared so missing-day
 * gaps stay honest.
 */

export function upsertEntry(
  log: BodyEntry[],
  date: ISODate,
  patch: Partial<Omit<BodyEntry, 'date'>>,
): void {
  let entry = log.find((e) => e.date === date)
  if (entry === undefined) {
    entry = { date, weight: null, bodyFat: null, water: null, bone: null, zoneMinutes: null }
    log.push(entry)
    log.sort((a, b) => compareISO(a.date, b.date))
  }
  Object.assign(entry, patch)
  const cleared = [entry.weight, entry.bodyFat, entry.water, entry.bone, entry.zoneMinutes]
  if (cleared.every((v) => (v ?? null) === null)) {
    log.splice(
      log.findIndex((e) => e.date === date),
      1,
    )
  }
}

export function removeEntry(log: BodyEntry[], date: ISODate): void {
  const i = log.findIndex((e) => e.date === date)
  if (i !== -1) log.splice(i, 1)
}

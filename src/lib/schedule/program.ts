import type { Settings } from '@/lib/shared'
import type { ProgramKey } from '@/lib/shared'
import type { ISODate } from '@/lib/shared'

/**
 * Program-lifecycle invariant (US-084): a program exists exactly when
 * `settings.startDate` is non-null, and starting never overwrites an existing
 * program — re-anchoring day 1 is `setStartDate`, which the Settings UI gates
 * behind a confirm when logged data exists.
 */

export function canStartProgram(settings: Settings): boolean {
  return settings.startDate === null
}

/** Begin a program on a fresh document; returns false (unchanged) if one exists. */
export function beginProgram(settings: Settings, startDate: ISODate, program: ProgramKey): boolean {
  if (!canStartProgram(settings)) return false
  settings.program = program
  settings.startDate = startDate
  return true
}

import type { AppState, ArchivedRound, BodyEntry, Settings } from '@/lib/shared'

/**
 * Round-archive invariants (E28 US-143). The archive is a raw-input snapshot:
 * ops/logs move over as-is and the round-scoped SETUP inputs are frozen so
 * reports recompute the round exactly as it was, whatever later rounds do to
 * Settings (rule 2 still holds — nothing derived is stored).
 */

export function defaultRoundLabel(existingCount: number): string {
  return `Round ${existingCount + 1}`
}

/**
 * Freeze the live round from a detached plain copy of the document (`current`
 * of the immer draft — never the draft itself, so nothing aliases).
 * Precondition: `plain.settings.startDate` is non-null.
 */
export function buildArchivedRound(
  plain: AppState,
  meta: { id: string; archivedAt: string; label: string },
): ArchivedRound {
  const s = plain.settings
  return {
    id: meta.id,
    archivedAt: meta.archivedAt,
    label: meta.label,
    program: s.program,
    startDate: s.startDate as string,
    scheduleOps: plain.scheduleOps,
    workoutLogs: plain.workoutLogs,
    bodyLog: plain.bodyLog,
    snapshot: {
      age: s.age ?? null,
      height: s.height ?? null,
      startWeight: s.startWeight ?? null,
      startBodyFat: s.startBodyFat ?? null,
      limits: { ...s.limits },
      targets: { ...s.targets },
      scoring: { ...s.scoring },
    },
  }
}

/**
 * The opt-in raw→raw seed for the next round's SETUP start stats: the latest
 * weigh-in per stat (weight and body-fat independently).
 */
export function latestStartStats(
  bodyLog: BodyEntry[],
): Partial<Pick<Settings, 'startWeight' | 'startBodyFat'>> {
  const lastWeight = bodyLog.findLast((e) => (e.weight ?? null) !== null)
  const lastBf = bodyLog.findLast((e) => (e.bodyFat ?? null) !== null)
  return {
    ...(lastWeight !== undefined ? { startWeight: lastWeight.weight ?? null } : {}),
    ...(lastBf !== undefined ? { startBodyFat: lastBf.bodyFat ?? null } : {}),
  }
}

/** Write an archived round's SETUP snapshot back to live settings (restore). */
export function applySnapshot(settings: Settings, round: ArchivedRound): void {
  settings.program = round.program
  settings.startDate = round.startDate
  settings.age = round.snapshot.age ?? null
  settings.height = round.snapshot.height ?? null
  settings.startWeight = round.snapshot.startWeight ?? null
  settings.startBodyFat = round.snapshot.startBodyFat ?? null
  settings.limits = { ...round.snapshot.limits }
  settings.targets = { ...round.snapshot.targets }
  settings.scoring = { ...round.snapshot.scoring }
}

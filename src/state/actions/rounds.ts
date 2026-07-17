import { clock } from '@/state/ports'
import { current } from 'immer'
import {
  applySnapshot,
  buildArchivedRound,
  defaultRoundLabel,
  latestStartStats,
} from '@/lib/rounds'
import { useStore } from '@/state/store'

/**
 * Round-lifecycle use-cases (E28 US-143) — the freeze/seed/restore rules live
 * in `@/lib/rounds` (archive.ts); these bind them to the store and keep the
 * immer mechanics (detached `current` copies) in the application layer.
 */

export function completeRound(options: { label?: string; seedFromLatest?: boolean } = {}): void {
  useStore.getState().mutate((draft) => {
    if (draft.settings.startDate === null) return
    // `current` detaches plain copies, so moving the subtrees into the archive
    // while resetting the live slots can never alias immer drafts.
    const plain = current(draft)
    draft.archivedRounds.push(
      buildArchivedRound(plain, {
        id: `r-${crypto.randomUUID()}`,
        archivedAt: clock.nowISO(),
        label: options.label?.trim() || defaultRoundLabel(draft.archivedRounds.length),
      }),
    )
    if (options.seedFromLatest === true) {
      Object.assign(draft.settings, latestStartStats(plain.bodyLog))
    }
    draft.settings.startDate = null
    draft.scheduleOps = []
    draft.workoutLogs = {}
    draft.bodyLog = []
  })
}

/**
 * Move an archived round back to live — the "archived too early" escape
 * hatch. Refused while a program is running (same guard philosophy as
 * `startProgram`); the snapshot restores Settings exactly as archived.
 */
export function restoreRound(id: string): void {
  useStore.getState().mutate((draft) => {
    if (draft.settings.startDate !== null) return
    const index = draft.archivedRounds.findIndex((r) => r.id === id)
    if (index === -1) return
    const round = current(draft.archivedRounds[index])
    draft.archivedRounds.splice(index, 1)
    applySnapshot(draft.settings, round)
    draft.scheduleOps = round.scheduleOps
    draft.workoutLogs = round.workoutLogs
    draft.bodyLog = round.bodyLog
  })
}

/** Rename an archived round; an empty label is ignored rather than stored. */
export function renameRound(id: string, label: string): void {
  const trimmed = label.trim()
  if (trimmed === '') return
  useStore.getState().mutate((draft) => {
    const round = draft.archivedRounds.find((r) => r.id === id)
    if (round !== undefined) round.label = trimmed
  })
}

/** Permanently delete an archived round (the UI confirms first). */
export function deleteRound(id: string): void {
  useStore.getState().mutate((draft) => {
    const index = draft.archivedRounds.findIndex((r) => r.id === id)
    if (index !== -1) draft.archivedRounds.splice(index, 1)
  })
}

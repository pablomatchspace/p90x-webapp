import { beginProgram } from '@/lib/schedule'
import { isISODate, type ISODate, type ProgramKey, type ScheduleOp } from '@/lib/shared'
import { useStore } from '@/state/store'

/** Schedule & program-lifecycle use-cases — invariants in `@/lib/schedule`. */

/** Append a reschedule op (validate upstream with `previewOp` first). */
export function addScheduleOp(op: ScheduleOp): void {
  useStore.getState().mutate((draft) => {
    draft.scheduleOps.push(op)
  })
}

/** Soft-delete: the op stays in the audit trail but stops applying. */
export function revertScheduleOp(opId: string): void {
  useStore.getState().mutate((draft) => {
    const op = draft.scheduleOps.find((o) => o.id === opId)
    if (op !== undefined && op.revertedAt === undefined) op.revertedAt = new Date().toISOString()
  })
}

/**
 * Begin a program on a fresh document (US-084) — the no-import entry path.
 * Refuses to overwrite an existing program (beginProgram's invariant):
 * re-anchoring day 1 goes through `setStartDate` on the Settings screen.
 */
export function startProgram(startDate: ISODate, program: ProgramKey): void {
  if (!isISODate(startDate)) return
  useStore.getState().mutate((draft) => {
    beginProgram(draft.settings, startDate, program)
  })
}

/**
 * Re-anchor the whole schedule to a new day 1 (US-070). The materializer
 * derives every calendar date from this; the UI gates the change behind a
 * confirm when logged data already exists.
 */
export function setStartDate(date: ISODate | null): void {
  if (date !== null && !isISODate(date)) return
  useStore.getState().mutate((draft) => {
    draft.settings.startDate = date
  })
}

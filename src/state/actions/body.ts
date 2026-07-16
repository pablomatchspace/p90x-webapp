import { removeEntry, upsertEntry } from '@/lib/body'
import { isISODate, type BodyEntry, type ISODate } from '@/lib/shared'
import { useStore } from '@/state/store'

/** Body-log use-cases (US-050) — invariants in `@/lib/body` (bodyLog.ts). */

export function upsertBodyEntry(date: ISODate, patch: Partial<Omit<BodyEntry, 'date'>>): void {
  if (!isISODate(date)) return
  useStore.getState().mutate((draft) => {
    upsertEntry(draft.bodyLog, date, patch)
  })
}

export function deleteBodyEntry(date: ISODate): void {
  useStore.getState().mutate((draft) => {
    removeEntry(draft.bodyLog, date)
  })
}

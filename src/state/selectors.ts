import { useMemo } from 'react'
import { materialize, type Schedule } from '@/lib/schedule/materialize'
import { previewOp, type OpPreview } from '@/lib/schedule/ops'
import { indexSessions, type SessionIndex } from '@/lib/schedule/status'
import type { ScheduleOp } from '@/lib/schema'
import { useStore } from '@/state/store'

/** Materialized schedule, or null until a start date exists. Recomputes only
 *  when program, start date or the op log change (immer keeps refs stable). */
export function useSchedule(): Schedule | null {
  const program = useStore((s) => s.data.settings.program)
  const startDate = useStore((s) => s.data.settings.startDate)
  const ops = useStore((s) => s.data.scheduleOps)
  return useMemo(
    () => (startDate === null ? null : materialize(program, startDate, ops)),
    [program, startDate, ops],
  )
}

export function useSessionIndex(): SessionIndex {
  const workoutLogs = useStore((s) => s.data.workoutLogs)
  return useMemo(() => indexSessions(workoutLogs), [workoutLogs])
}

/** Live engine-backed preview of a candidate reschedule op against current state. */
export function useOpPreview(candidate: ScheduleOp | null): OpPreview | null {
  const program = useStore((s) => s.data.settings.program)
  const startDate = useStore((s) => s.data.settings.startDate)
  const ops = useStore((s) => s.data.scheduleOps)
  return useMemo(
    () =>
      candidate === null || startDate === null
        ? null
        : previewOp(program, startDate, ops, candidate),
    [program, startDate, ops, candidate],
  )
}

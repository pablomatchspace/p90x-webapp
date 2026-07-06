import { useMemo } from 'react'
import { materialize, type Schedule } from '@/lib/schedule/materialize'
import { indexSessions, type SessionIndex } from '@/lib/schedule/status'
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

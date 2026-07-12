import { useMemo } from 'react'
import { computeAdherence, type Adherence } from '@/lib/adherence'
import { todayISO } from '@/lib/dates'
import { materialize, type Schedule } from '@/lib/schedule/materialize'
import { previewOp, type OpPreview } from '@/lib/schedule/ops'
import { indexSessions, type SessionIndex } from '@/lib/schedule/status'
import type { AppState, ScheduleOp, ScoringSettings, Session, Settings } from '@/lib/schema'
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

export function useWorkoutLogs(): AppState['workoutLogs'] {
  return useStore((s) => s.data.workoutLogs)
}

/** One workout's sessions keyed by programDayId (the log-screen shape). */
export function useWorkoutSessions(workoutKey: string): Map<string, Session> {
  const log = useStore((s) => s.data.workoutLogs[workoutKey])
  return useMemo(() => new Map((log?.sessions ?? []).map((s) => [s.programDayId, s])), [log])
}

export function useScoringSettings(): ScoringSettings {
  return useStore((s) => s.data.settings.scoring)
}

export function useSettings(): Settings {
  return useStore((s) => s.data.settings)
}

/** E23: one workout's media deeplinks, or undefined when none are configured. */
export function useWorkoutLinks(workoutKey: string): Settings['workoutLinks'][string] | undefined {
  return useStore((s) => s.data.settings.workoutLinks[workoutKey])
}

/** Scale entries, sorted ascending by date (the upsert action keeps the order). */
export function useBodyLog(): AppState['bodyLog'] {
  return useStore((s) => s.data.bodyLog)
}

export function useSessionIndex(): SessionIndex {
  const workoutLogs = useStore((s) => s.data.workoutLogs)
  return useMemo(() => indexSessions(workoutLogs), [workoutLogs])
}

/** Adherence & pace stats (US-062), recomputed live from the schedule + logs. */
export function useAdherence(): Adherence | null {
  const schedule = useSchedule()
  const index = useSessionIndex()
  const ops = useStore((s) => s.data.scheduleOps)
  return useMemo(
    () => (schedule === null ? null : computeAdherence(schedule, index, ops, todayISO())),
    [schedule, index, ops],
  )
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

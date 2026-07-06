// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { emptyState } from '@/lib/schema'
import {
  addScheduleOp,
  revertScheduleOp,
  setCompletionStatus,
  setWorkoutCompleted,
} from '@/state/actions'
import { useStore } from '@/state/store'

beforeEach(() => {
  useStore.setState((s) => ({ ...s, data: emptyState() }))
})

describe('quick-log actions', () => {
  it('creates a session on first log and updates it on repeat', () => {
    setCompletionStatus('plyometrics', 'd002', 'yes')
    let sessions = useStore.getState().data.workoutLogs['plyometrics'].sessions
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ programDayId: 'd002', status: 'yes' })
    expect(sessions[0].loggedAt).toBeTruthy()

    setCompletionStatus('plyometrics', 'd002', 'no')
    sessions = useStore.getState().data.workoutLogs['plyometrics'].sessions
    expect(sessions).toHaveLength(1)
    expect(sessions[0].status).toBe('no')
  })

  it('keeps sessions on different program days separate', () => {
    setCompletionStatus('plyometrics', 'd002', 'yes')
    setCompletionStatus('plyometrics', 'd009', 'yes')
    expect(useStore.getState().data.workoutLogs['plyometrics'].sessions).toHaveLength(2)
  })

  it('sets and clears the strength completed override', () => {
    setWorkoutCompleted('chest-back', 'd001', true)
    expect(useStore.getState().data.workoutLogs['chest-back'].sessions[0].completed).toBe(true)
    setWorkoutCompleted('chest-back', 'd001', undefined)
    expect(useStore.getState().data.workoutLogs['chest-back'].sessions[0].completed).toBeUndefined()
  })
})

describe('reschedule op actions', () => {
  it('appends ops and reverts them exactly once', () => {
    addScheduleOp({ id: 'op1', createdAt: 't', kind: 'skip', date: '2026-01-14' })
    expect(useStore.getState().data.scheduleOps).toHaveLength(1)

    revertScheduleOp('op1')
    const stamped = useStore.getState().data.scheduleOps[0].revertedAt
    expect(stamped).toBeTruthy()

    revertScheduleOp('op1') // idempotent — the audit timestamp is not rewritten
    expect(useStore.getState().data.scheduleOps[0].revertedAt).toBe(stamped)

    revertScheduleOp('unknown') // unknown id is a no-op
    expect(useStore.getState().data.scheduleOps).toHaveLength(1)
  })
})

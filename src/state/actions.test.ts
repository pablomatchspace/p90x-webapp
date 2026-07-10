// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { emptyState } from '@/lib/schema'
import {
  addScheduleOp,
  deleteBodyEntry,
  revertScheduleOp,
  setCompletionStatus,
  setNotes,
  setRoundValue,
  setSessionAnnotation,
  setSessionNotes,
  setStartDate,
  setWorkoutCompleted,
  startProgram,
  updateLimits,
  updateScoring,
  updateSettings,
  updateTargets,
  upsertBodyEntry,
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

describe('round entry actions', () => {
  const entry = () =>
    useStore.getState().data.workoutLogs['chest-back'].sessions[0].entries?.['standard-push-ups']

  it('creates the entry with the catalog round count and sets the value', () => {
    setRoundValue('chest-back', 'd001', 'standard-push-ups', 1, 'main', 15)
    expect(entry()).toEqual({
      rounds: [
        { main: null, secondary: null },
        { main: 15, secondary: null },
      ],
    })
  })

  it('removes the entry again once every value is cleared', () => {
    setRoundValue('chest-back', 'd001', 'standard-push-ups', 0, 'main', 22)
    setRoundValue('chest-back', 'd001', 'standard-push-ups', 0, 'secondary', 4)
    setRoundValue('chest-back', 'd001', 'standard-push-ups', 0, 'main', null)
    expect(entry()?.rounds[0]).toEqual({ main: null, secondary: 4 })
    setRoundValue('chest-back', 'd001', 'standard-push-ups', 0, 'secondary', null)
    expect(entry()).toBeUndefined()
  })

  it('ignores out-of-range rounds and unknown exercises without leaving residue', () => {
    setRoundValue('chest-back', 'd001', 'standard-push-ups', 5, 'main', 10)
    setRoundValue('chest-back', 'd001', 'no-such-exercise', 0, 'main', 10)
    expect(useStore.getState().data.workoutLogs['chest-back']).toBeUndefined()
  })

  it('stores annotation and notes on the session', () => {
    setSessionAnnotation('chest-back', 'd008', '2 with chestweight')
    setSessionNotes('chest-back', 'd008', 'felt strong')
    const session = useStore.getState().data.workoutLogs['chest-back'].sessions[0]
    expect(session.annotation).toBe('2 with chestweight')
    expect(session.notes).toBe('felt strong')
  })
})

describe('body log actions', () => {
  it('creates entries lazily, updates them in place, and keeps dates sorted', () => {
    upsertBodyEntry('2026-01-07', { weight: 81.9 })
    upsertBodyEntry('2026-01-06', { weight: 82 })
    upsertBodyEntry('2026-01-07', { bodyFat: 0.219 })
    const log = useStore.getState().data.bodyLog
    expect(log.map((e) => e.date)).toEqual(['2026-01-06', '2026-01-07'])
    expect(log[1]).toMatchObject({ weight: 81.9, bodyFat: 0.219 })
  })

  it('removes the entry once every field is cleared', () => {
    upsertBodyEntry('2026-01-06', { weight: 82, water: 0.55 })
    upsertBodyEntry('2026-01-06', { weight: null })
    expect(useStore.getState().data.bodyLog).toHaveLength(1)
    upsertBodyEntry('2026-01-06', { water: null })
    expect(useStore.getState().data.bodyLog).toHaveLength(0)
  })

  it('deletes by date and ignores unknown dates or malformed input', () => {
    upsertBodyEntry('2026-01-06', { weight: 82 })
    upsertBodyEntry('not-a-date', { weight: 1 })
    deleteBodyEntry('2026-02-01')
    expect(useStore.getState().data.bodyLog).toHaveLength(1)
    deleteBodyEntry('2026-01-06')
    expect(useStore.getState().data.bodyLog).toHaveLength(0)
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

describe('settings & notes actions', () => {
  it('stores free-form notes (US-071)', () => {
    setNotes('day 15 felt strong')
    expect(useStore.getState().data.notes).toBe('day 15 felt strong')
  })

  it('patches core settings and nested target/limit groups', () => {
    updateSettings({ startWeight: 80, units: 'imperial' })
    updateTargets({ bodyFat: 0.14 })
    updateLimits({ bmi: 27 })
    const s = useStore.getState().data.settings
    expect(s.startWeight).toBe(80)
    expect(s.units).toBe('imperial')
    expect(s.targets.bodyFat).toBe(0.14)
    expect(s.limits.bmi).toBe(27)
  })

  it('ignores non-positive scoring divisors but honours the on/off flag', () => {
    updateScoring({ penaltyDivisor: 0, chairFactor: -1, penaltyOn: false })
    const scoring = useStore.getState().data.settings.scoring
    expect(scoring.penaltyDivisor).toBe(2) // 0 rejected — would divide by zero
    expect(scoring.chairFactor).toBe(2) // -1 rejected
    expect(scoring.penaltyOn).toBe(false)
    updateScoring({ penaltyDivisor: 3 })
    expect(useStore.getState().data.settings.scoring.penaltyDivisor).toBe(3)
  })

  it('rejects a malformed start date but accepts a valid one', () => {
    setStartDate('nope')
    expect(useStore.getState().data.settings.startDate).toBeNull()
    setStartDate('2026-05-25')
    expect(useStore.getState().data.settings.startDate).toBe('2026-05-25')
  })
})

describe('startProgram (US-084)', () => {
  it('begins a program on a fresh document without importing anything', () => {
    startProgram('2026-01-05', 'lean')
    const { settings, workoutLogs, bodyLog } = useStore.getState().data
    expect(settings.startDate).toBe('2026-01-05')
    expect(settings.program).toBe('lean')
    // the schedule derives from (program, startDate) alone — nothing else is seeded
    expect(workoutLogs).toEqual({})
    expect(bodyLog).toEqual([])
    expect(settings.scoring).toEqual(emptyState().settings.scoring)
  })

  it('refuses to overwrite an existing program', () => {
    startProgram('2026-01-05', 'classic')
    startProgram('2026-03-01', 'lean')
    const { settings } = useStore.getState().data
    expect(settings.startDate).toBe('2026-01-05')
    expect(settings.program).toBe('classic')
  })

  it('ignores a malformed start date', () => {
    startProgram('05/01/2026', 'classic')
    expect(useStore.getState().data.settings.startDate).toBeNull()
  })
})

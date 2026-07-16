// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { emptyState } from '@/lib/shared'
import {
  addScheduleOp,
  completeRound,
  deleteBodyEntry,
  deleteRound,
  renameRound,
  restoreRound,
  revertScheduleOp,
  setCompletionStatus,
  setNotes,
  setRoundValue,
  setExerciseDone,
  setSessionAnnotation,
  setSessionNotes,
  setStartDate,
  setWorkoutCompleted,
  startProgram,
  updateLimits,
  updatePlayerSettings,
  updateScoring,
  updateSettings,
  updateTargets,
  updateWorkoutLink,
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

describe('player settings & per-exercise play log (E16)', () => {
  it('toggles the persisted auto-mark-done preference (Q17)', () => {
    expect(useStore.getState().data.settings.player.autoMarkDone).toBe(false)
    updatePlayerSettings({ autoMarkDone: true })
    expect(useStore.getState().data.settings.player.autoMarkDone).toBe(true)
    updatePlayerSettings({ autoMarkDone: false })
    expect(useStore.getState().data.settings.player.autoMarkDone).toBe(false)
  })

  it('coerces non-boolean autoMarkDone to a real boolean', () => {
    updatePlayerSettings({ autoMarkDone: 'truthy' as unknown as boolean })
    expect(useStore.getState().data.settings.player.autoMarkDone).toBe(true)
    updatePlayerSettings({ autoMarkDone: undefined })
    expect(useStore.getState().data.settings.player.autoMarkDone).toBe(true) // undefined = no-op
  })

  it('merges per-exercise done/skipped flags into the session (Q21c)', () => {
    setExerciseDone('plyometrics', 'd002', { 'jump-squats': true, 'hop-squats': false })
    const session = useStore.getState().data.workoutLogs['plyometrics'].sessions[0]
    expect(session.exerciseDone).toEqual({ 'jump-squats': true, 'hop-squats': false })
    expect(session.loggedAt).toBeTruthy()
  })

  it('merges successive patches in place (corrections on the summary checklist)', () => {
    setExerciseDone('plyometrics', 'd002', { 'jump-squats': true, 'hop-squats': false })
    setExerciseDone('plyometrics', 'd002', { 'hop-squats': true }) // corrected on the summary
    const session = useStore.getState().data.workoutLogs['plyometrics'].sessions[0]
    expect(session.exerciseDone).toEqual({ 'jump-squats': true, 'hop-squats': true })
    expect(useStore.getState().data.workoutLogs['plyometrics'].sessions).toHaveLength(1)
  })

  it('keeps per-day play logs separate', () => {
    setExerciseDone('plyometrics', 'd002', { 'jump-squats': true })
    setExerciseDone('plyometrics', 'd009', { 'jump-squats': false })
    const logs = useStore.getState().data.workoutLogs['plyometrics'].sessions
    expect(logs).toHaveLength(2)
    expect(logs[0].exerciseDone).toEqual({ 'jump-squats': true })
    expect(logs[1].exerciseDone).toEqual({ 'jump-squats': false })
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

describe('updateWorkoutLink (E23)', () => {
  const links = () => useStore.getState().data.settings.workoutLinks

  it('stores trimmed video and audio links per workout', () => {
    updateWorkoutLink('plyometrics', 'video', '  https://example.com/plyo.mp4 ')
    updateWorkoutLink('plyometrics', 'audio', 'https://example.com/plyo.mp3')
    expect(links()['plyometrics']).toEqual({
      video: 'https://example.com/plyo.mp4',
      audio: 'https://example.com/plyo.mp3',
    })
  })

  it('replaces an existing link in place', () => {
    updateWorkoutLink('yoga-x', 'video', 'https://a.example/1')
    updateWorkoutLink('yoga-x', 'video', 'https://a.example/2')
    expect(links()['yoga-x']).toEqual({ video: 'https://a.example/2' })
  })

  it('clears one kind and drops the workout once both are gone', () => {
    updateWorkoutLink('kenpo-x', 'video', 'https://a.example/v')
    updateWorkoutLink('kenpo-x', 'audio', 'https://a.example/a')
    updateWorkoutLink('kenpo-x', 'video', null)
    expect(links()['kenpo-x']).toEqual({ audio: 'https://a.example/a' })
    updateWorkoutLink('kenpo-x', 'audio', null)
    expect(links()['kenpo-x']).toBeUndefined()
  })

  it('never stores a non-http(s) or malformed URL', () => {
    updateWorkoutLink('plyometrics', 'video', 'javascript:alert(1)')
    updateWorkoutLink('plyometrics', 'video', 'data:text/html,x')
    updateWorkoutLink('plyometrics', 'video', 'example.com/no-scheme')
    expect(links()).toEqual({})
  })

  it('ignores unknown workout keys', () => {
    updateWorkoutLink('nope', 'video', 'https://a.example/v')
    expect(links()).toEqual({})
  })
})

describe('round lifecycle (E28 US-143)', () => {
  function liveRound() {
    startProgram('2026-01-05', 'classic')
    updateSettings({ age: 40, height: 1.8, startWeight: 82, startBodyFat: 0.22 })
    updateTargets({ leanMassIncrease: 4, bodyFat: 0.15 })
    addScheduleOp({ kind: 'skip', id: 'op1', createdAt: 't', date: '2026-01-14' })
    setRoundValue('chest-back', 'd001', 'standard-push-ups', 0, 'main', 20)
    setCompletionStatus('plyometrics', 'd002', 'yes')
    upsertBodyEntry('2026-01-06', { weight: 82, bodyFat: 0.22 })
    upsertBodyEntry('2026-03-30', { weight: 78.5, bodyFat: 0.18 })
  }

  it('archives the live round and resets the round-scoped state', () => {
    liveRound()
    completeRound()
    const { settings, scheduleOps, workoutLogs, bodyLog, rounds } = useStore.getState().data
    expect(settings.startDate).toBeNull()
    expect(scheduleOps).toEqual([])
    expect(workoutLogs).toEqual({})
    expect(bodyLog).toEqual([])
    expect(rounds).toHaveLength(1)
    const round = rounds[0]
    expect(round.label).toBe('Round 1')
    expect(round.program).toBe('classic')
    expect(round.startDate).toBe('2026-01-05')
    expect(round.scheduleOps).toHaveLength(1)
    expect(round.workoutLogs['chest-back'].sessions).toHaveLength(1)
    expect(round.bodyLog).toHaveLength(2)
    expect(round.snapshot).toMatchObject({ height: 1.8, startWeight: 82, startBodyFat: 0.22 })
    // global preferences survive
    expect(settings.units).toBe('metric')
    expect(settings.scoring).toEqual(emptyState().settings.scoring)
  })

  it('keeps SETUP start stats unless asked to seed from the latest weigh-in', () => {
    liveRound()
    completeRound()
    expect(useStore.getState().data.settings.startWeight).toBe(82)
    expect(useStore.getState().data.settings.startBodyFat).toBe(0.22)
  })

  it('seeds the next round start stats from the latest weigh-in on request', () => {
    liveRound()
    upsertBodyEntry('2026-04-01', { bodyFat: 0.17 }) // BF-only weigh-in after the last weight
    completeRound({ seedFromLatest: true })
    const { settings } = useStore.getState().data
    expect(settings.startWeight).toBe(78.5) // latest entry with a weight
    expect(settings.startBodyFat).toBe(0.17) // latest entry with a BF reading
  })

  it('is a no-op without a live program, and labels default sequentially', () => {
    completeRound()
    expect(useStore.getState().data.rounds).toEqual([])
    liveRound()
    completeRound()
    startProgram('2026-04-06', 'classic')
    completeRound({ label: '  ' }) // blank label falls back to the default
    const labels = useStore.getState().data.rounds.map((r) => r.label)
    expect(labels).toEqual(['Round 1', 'Round 2'])
  })

  it('restore is archive⁻¹ for the round-scoped state', () => {
    liveRound()
    const before = JSON.parse(JSON.stringify(useStore.getState().data))
    completeRound()
    restoreRound(useStore.getState().data.rounds[0].id)
    const after = JSON.parse(JSON.stringify(useStore.getState().data))
    expect(after).toEqual(before)
  })

  it('refuses to restore while a program is running', () => {
    liveRound()
    completeRound()
    const id = useStore.getState().data.rounds[0].id
    startProgram('2026-04-06', 'lean')
    restoreRound(id)
    const { settings, rounds } = useStore.getState().data
    expect(settings.startDate).toBe('2026-04-06')
    expect(settings.program).toBe('lean')
    expect(rounds).toHaveLength(1)
  })

  it('renames with a non-empty label and deletes by id', () => {
    liveRound()
    completeRound()
    const id = useStore.getState().data.rounds[0].id
    renameRound(id, '  Winter round  ')
    expect(useStore.getState().data.rounds[0].label).toBe('Winter round')
    renameRound(id, '   ')
    expect(useStore.getState().data.rounds[0].label).toBe('Winter round')
    deleteRound('nope')
    expect(useStore.getState().data.rounds).toHaveLength(1)
    deleteRound(id)
    expect(useStore.getState().data.rounds).toEqual([])
  })
})

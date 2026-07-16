import { describe, expect, it } from 'vitest'
import { computeAdherence } from '@/lib/schedule'
import { materialize } from '@/lib/schedule'
import { indexSessions } from '@/lib/schedule'
import { emptyState, type AppState, type ExerciseEntry } from '@/lib/shared'
import { archivedRoundData, buildRoundReport, liveRoundData, type RoundData } from './roundReport'

/** Both rounds filled equally: score = reps, penalty = 0, net = reps. */
function pushUps(reps: number): ExerciseEntry {
  return {
    rounds: [
      { main: reps, secondary: null },
      { main: reps, secondary: null },
    ],
  }
}

function roundData(): RoundData {
  const scoring = emptyState().settings.scoring
  return {
    program: 'classic',
    startDate: '2026-01-05',
    scheduleOps: [],
    workoutLogs: {
      'chest-back': {
        sessions: [
          { programDayId: 'd001', entries: { 'standard-push-ups': pushUps(20) } },
          { programDayId: 'd008', entries: { 'standard-push-ups': pushUps(25) } },
        ],
      },
    },
    bodyLog: [
      { date: '2026-01-06', weight: 82, bodyFat: 0.22, water: null, bone: null, zoneMinutes: null },
      {
        date: '2026-03-30',
        weight: 78.5,
        bodyFat: 0.18,
        water: null,
        bone: null,
        zoneMinutes: null,
      },
    ],
    snapshot: {
      age: 40,
      height: 1.8,
      startWeight: 82,
      startBodyFat: 0.22,
      limits: { weight: 90, bodyFat: 0.25, bmi: 28 },
      targets: { leanMassIncrease: 4, bodyFat: 0.15, ffmi: null },
      scoring,
    },
  }
}

describe('buildRoundReport (US-144)', () => {
  it('adherence equals the dashboard engine for the same inputs', () => {
    const data = roundData()
    const report = buildRoundReport(data, '2026-01-10')
    const schedule = materialize(data.program, data.startDate, data.scheduleOps)
    const expected = computeAdherence(
      schedule,
      indexSessions(data.workoutLogs),
      data.scheduleOps,
      '2026-01-10',
    )
    expect(report.asOf).toBe('2026-01-10')
    expect(report.completed).toBe(false)
    expect(report.adherence).toEqual(expected)
  })

  it('judges an archived round at projected completion — nothing pending', () => {
    const report = buildRoundReport(roundData())
    expect(report.asOf).toBe(report.schedule.projectedCompletion)
    expect(report.completed).toBe(true)
    expect(report.adherence.dayReached).toBe(90)
    expect(report.adherence.pending).toBe(0)
    expect(report.adherence.missed).toBeGreaterThan(0)
  })

  it('derives body outcomes from the snapshot inputs', () => {
    const report = buildRoundReport(roundData())
    const byKey = new Map(report.body.map((o) => [o.key, o]))
    expect(byKey.get('weight')).toMatchObject({
      first: { date: '2026-01-06', value: 82 },
      latest: { date: '2026-03-30', value: 78.5 },
    })
    expect(byKey.get('weight')?.delta).toBeCloseTo(-3.5, 10)
    expect(byKey.get('bodyFat')?.delta).toBeCloseTo(-0.04, 10)
    expect(byKey.get('bmi')?.first?.value).toBeCloseTo(82 / 1.8 ** 2, 6)
    expect(byKey.get('leanMass')?.latest?.value).toBeCloseTo(78.5 * 0.82, 6)
    expect(byKey.get('ffmi')?.delta).not.toBeNull()
  })

  it('needs two dated samples for a delta', () => {
    const data = roundData()
    data.bodyLog = data.bodyLog.slice(0, 1)
    const weight = buildRoundReport(data).body.find((o) => o.key === 'weight')
    expect(weight?.first).toEqual(weight?.latest)
    expect(weight?.delta).toBeNull()
  })

  it('ignores weigh-ins outside the round window (pre-day-1 history, post-round logging)', () => {
    const data = roundData()
    data.bodyLog = [
      // pre-day-1: imported history from before the round started
      { date: '2026-01-01', weight: 84, bodyFat: null, water: null, bone: null, zoneMinutes: null },
      ...data.bodyLog,
      // after the round's last program day: still logging before archiving
      { date: '2026-06-01', weight: 70, bodyFat: null, water: null, bone: null, zoneMinutes: null },
    ]
    const report = buildRoundReport(data)
    const weight = report.body.find((o) => o.key === 'weight')
    expect(weight?.first).toEqual({ date: '2026-01-06', value: 82 })
    expect(weight?.latest).toEqual({ date: '2026-03-30', value: 78.5 })
    expect(weight?.delta).toBeCloseTo(-3.5, 10)
  })

  it('rolls up workout outcomes and cross-workout top movers', () => {
    const report = buildRoundReport(roundData())
    const chestBack = report.workouts.find((w) => w.key === 'chest-back')
    expect(chestBack).toMatchObject({ occurrences: 5, logged: 2 })
    expect(chestBack?.firstNet).toBeCloseTo(20, 10)
    expect(chestBack?.latestNet).toBeCloseTo(25, 10)
    expect(chestBack?.delta).toBeCloseTo(5, 10)
    // untouched loggable workouts still appear (their rotation ran), unlogged
    const arx = report.workouts.find((w) => w.key === 'ab-ripper-x')
    expect(arx?.logged).toBe(0)
    expect(arx?.delta).toBeNull()
    // top movers: only exercises with two logged ends, ranked by gain
    expect(report.topMovers[0]).toMatchObject({
      exerciseId: 'standard-push-ups',
      workoutKey: 'chest-back',
    })
    expect(report.topMovers[0].delta).toBeCloseTo(5, 10)
    expect(report.topMovers.every((m) => m.delta !== null)).toBe(true)
  })
})

describe('round data normalizers', () => {
  it('liveRoundData mirrors settings and is null without a program', () => {
    const state: AppState = emptyState()
    expect(liveRoundData(state)).toBeNull()
    state.settings.startDate = '2026-01-05'
    state.settings.height = 1.8
    const data = liveRoundData(state)
    expect(data).toMatchObject({
      program: 'classic',
      startDate: '2026-01-05',
      snapshot: { height: 1.8, scoring: state.settings.scoring },
    })
  })

  it('archivedRoundData exposes the frozen snapshot as-is', () => {
    const base = roundData()
    const data = archivedRoundData({
      id: 'r-1',
      archivedAt: '2026-04-05T00:00:00Z',
      label: 'Round 1',
      program: base.program,
      startDate: base.startDate,
      scheduleOps: base.scheduleOps,
      workoutLogs: base.workoutLogs,
      bodyLog: base.bodyLog,
      snapshot: base.snapshot,
    })
    expect(data).toEqual(base)
  })
})

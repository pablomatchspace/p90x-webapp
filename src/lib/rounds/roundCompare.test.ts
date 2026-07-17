import { describe, expect, it } from 'vitest'
import { emptyState, type ExerciseEntry } from '@/lib/shared'
import { bodySeriesByDay, comparableWorkouts, netSeriesByOccurrence } from './roundCompare'
import type { RoundData } from './roundReport'
import { kg, meters } from '@/lib/shared'

function pushUps(reps: number): ExerciseEntry {
  return {
    rounds: [
      { reps: reps, assist: null },
      { reps: reps, assist: null },
    ],
  }
}

/** Two rounds with different start dates and logs, comparable by construction. */
function round(startDate: string, reps: number[], weights: [string, number][]): RoundData {
  return {
    program: 'classic',
    startDate,
    scheduleOps: [],
    workoutLogs: {
      'chest-back': {
        sessions: reps.map((r, i) => ({
          // classic chest-back occurrences: d001, d008, d015, d057, d071
          programDayId: ['d001', 'd008', 'd015'][i],
          entries: { 'standard-push-ups': pushUps(r) },
        })),
      },
    },
    bodyLog: weights.map(([date, weight]) => ({
      date,
      weight: weight === null ? null : kg(weight),
      bodyFat: null,
      water: null,
      bone: null,
      zoneMinutes: null,
    })),
    snapshot: {
      age: null,
      height: meters(1.8),
      startWeight: weights[0]?.[1] != null ? kg(weights[0][1]) : null,
      startBodyFat: null,
      limits: { weight: null, bodyFat: null, bmi: null },
      targets: { leanMassIncrease: null, bodyFat: null, ffmi: null },
      scoring: emptyState().settings.scoring,
    },
  }
}

describe('bodySeriesByDay (US-146)', () => {
  it('re-bases weigh-ins onto day-of-round so different start dates align', () => {
    const a = round(
      '2026-01-05',
      [],
      [
        ['2026-01-05', 82],
        ['2026-01-14', 81],
      ],
    )
    const b = round(
      '2026-04-06',
      [],
      [
        ['2026-04-06', 80],
        ['2026-04-15', 79],
      ],
    )
    expect(bodySeriesByDay(a, 'weight')).toEqual([
      { x: 1, y: 82 },
      { x: 10, y: 81 },
    ])
    expect(bodySeriesByDay(b, 'weight')).toEqual([
      { x: 1, y: 80 },
      { x: 10, y: 79 },
    ])
  })

  it('drops weigh-ins before day 1 and entries without the metric', () => {
    const data = round(
      '2026-01-05',
      [],
      [
        ['2026-01-01', 83],
        ['2026-01-05', 82],
      ],
    )
    expect(bodySeriesByDay(data, 'weight')).toEqual([{ x: 1, y: 82 }])
    expect(bodySeriesByDay(data, 'bodyFat')).toEqual([])
  })

  it('drops weigh-ins logged after the round ended', () => {
    // classic, no ops: last program day is 2026-04-05 (start + 89 days)
    const data = round(
      '2026-01-05',
      [],
      [
        ['2026-01-05', 82],
        ['2026-06-01', 70], // still logging months after this round ended
      ],
    )
    expect(bodySeriesByDay(data, 'weight')).toEqual([{ x: 1, y: 82 }])
  })
})

describe('netSeriesByOccurrence (US-146)', () => {
  it('aligns totals by occurrence index with gaps for unlogged sessions', () => {
    const data = round('2026-01-05', [20, 25], [])
    const series = netSeriesByOccurrence(data, 'chest-back')
    expect(series).toHaveLength(5) // classic chest-back runs 5 times
    expect(series[0]).toEqual({ x: 1, y: 20 })
    expect(series[1]).toEqual({ x: 2, y: 25 })
    expect(series[2].y).toBeNull()
  })

  it('is reschedule-tolerant: a skip shifts dates, not occurrence indices', () => {
    const data = round('2026-01-05', [20, 25], [])
    data.scheduleOps = [{ kind: 'skip', id: 'op1', createdAt: 't', date: '2026-01-06' }]
    const series = netSeriesByOccurrence(data, 'chest-back')
    expect(series[0]).toEqual({ x: 1, y: 20 })
    expect(series[1]).toEqual({ x: 2, y: 25 })
  })
})

describe('comparableWorkouts (US-146)', () => {
  it('lists loggable workouts with data in either round, alphabetically', () => {
    const a = round('2026-01-05', [20], [])
    const b = round('2026-04-06', [], [])
    b.workoutLogs = {
      'ab-ripper-x': {
        sessions: [
          {
            programDayId: 'd001',
            entries: { 'in-and-out': { rounds: [{ reps: 25, assist: null }] } },
          },
        ],
      },
      'yoga-x': { sessions: [{ programDayId: 'd004', completion: 'yes' }] }, // completion-style: excluded
    }
    expect(comparableWorkouts(a, b)).toEqual(['ab-ripper-x', 'chest-back'])
  })
})

import { describe, expect, it } from 'vitest'
import { getWorkout, type CatalogExercise } from '@/lib/programData'
import { emptyState, type ExerciseEntry, type Session } from '@/lib/schema'
import { formatScore, scoreExercise, sessionTotals } from './scoring'

const SCORING = emptyState().settings.scoring // workbook defaults: ÷2 on, chair 2, R×W ÷10

function ex(workoutKey: string, id: string): CatalogExercise {
  const found = getWorkout(workoutKey).exercises?.find((e) => e.id === id)
  if (found === undefined) throw new Error(`missing catalog exercise ${workoutKey}/${id}`)
  return found
}

function entry(...rounds: Array<[number | null, number | null]>): ExerciseEntry {
  return { rounds: rounds.map(([main, secondary]) => ({ main, secondary })) }
}

describe('US-040 golden master — Chest & Back week 1 (workbook)', () => {
  // Raw inputs lifted from the real converted workbook; expected values are the
  // PRD §US-040 fixture computed under the canonical B3 rule. One documented
  // deviation: decline-push-ups penalty is 0.5 here (adjusted comparison
  // 10 vs 6+6/2=9) where the sheet's week-1 formula (raw 10 vs 12) shows 0.
  const week1: Array<[string, [number, number | null], [number, number | null], number, number]> = [
    ['standard-push-ups', [22, null], [15, null], 18.5, 3.5],
    ['wide-front-pull-ups', [12, null], [10, null], 11, 1],
    ['military-push-ups', [15, null], [10, null], 12.5, 2.5],
    ['reverse-grip-chin-ups', [10, null], [8, null], 9, 1],
    ['wide-fly-push-ups', [15, null], [13, null], 14, 1],
    ['closed-grip-overhand-pull-ups', [8, null], [8, null], 8, 0],
    ['decline-push-ups', [10, null], [6, 6], 9.5, 0.5],
    ['heavy-pants', [10, 11], [12, 11], 12.1, 0],
    ['diamond-push-ups', [15, null], [10, null], 12.5, 2.5],
    ['lawnmowers', [12, 11], [12, 11], 13.2, 0],
    ['dive-bomber-push-ups', [8, null], [6, null], 7, 1],
    ['back-flys', [8, 11], [8, 11], 8.8, 0],
  ]

  it.each(week1)('%s scores as in the workbook', (id, r1, r2, score, penalty) => {
    const result = scoreExercise(entry(r1, r2), ex('chest-back', id), SCORING)
    expect(result.score).toBeCloseTo(score, 10)
    expect(result.penalty).toBeCloseTo(penalty, 10)
    expect(result.net).toBeCloseTo(score - penalty, 10)
    // every zero-penalty week-1 row is a hold/improve, so drop tracks the penalty
    expect(result.drop).toBe(penalty > 0)
  })
})

describe('scoreExercise', () => {
  it('keeps the weighted penalty in the same ÷rwDivisor scale as the score', () => {
    // 12×11=132 → 13.2 vs 10×11=110 → 11: penalty (13.2−11)/2
    const result = scoreExercise(
      entry([12, 11], [10, 11]),
      ex('chest-back', 'heavy-pants'),
      SCORING,
    )
    expect(result.score).toBeCloseTo(12.1, 10)
    expect(result.penalty).toBeCloseTo(1.1, 10)
    expect(result.drop).toBe(true)
  })

  it("sums both sides for 'extra' single-round rows", () => {
    const result = scoreExercise(entry([20, 18]), ex('legs-back', 'balance-lunge'), SCORING)
    expect(result).toEqual({ score: 38, penalty: 0, net: 38, drop: null })
  })

  it('averages only the rounds with data and holds the penalty until round 2 exists', () => {
    const result = scoreExercise(
      entry([22, null], [null, null]),
      ex('chest-back', 'standard-push-ups'),
      SCORING,
    )
    expect(result).toEqual({ score: 22, penalty: 0, net: 22, drop: null })
  })

  it('counts a secondary-only round (all-assisted set) with the chair factor', () => {
    const result = scoreExercise(entry([null, 8]), ex('chest-back', 'wide-front-pull-ups'), SCORING)
    expect(result.score).toBe(4)
  })

  it('computes the drop flag even with penalties switched off', () => {
    const off = { ...SCORING, penaltyOn: false }
    const result = scoreExercise(
      entry([22, null], [15, null]),
      ex('chest-back', 'standard-push-ups'),
      off,
    )
    expect(result.penalty).toBe(0)
    expect(result.net).toBe(result.score)
    expect(result.drop).toBe(true)
  })

  it('respects a custom chair factor', () => {
    const cf3 = { ...SCORING, chairFactor: 3 }
    const result = scoreExercise(entry([6, 6]), ex('chest-back', 'decline-push-ups'), cf3)
    expect(result.score).toBe(8)
  })

  it('returns all-null for untouched entries', () => {
    expect(scoreExercise(undefined, ex('chest-back', 'standard-push-ups'), SCORING)).toEqual({
      score: null,
      penalty: null,
      net: null,
      drop: null,
    })
    expect(
      scoreExercise(
        entry([null, null], [null, null]),
        ex('chest-back', 'standard-push-ups'),
        SCORING,
      ),
    ).toEqual({ score: null, penalty: null, net: null, drop: null })
  })

  it('averages Strip-Set Curls over its 4 rounds with no round-drop penalty', () => {
    const result = scoreExercise(
      entry([12, 25], [10, 20], [8, 15], [6, 10]),
      ex('back-biceps', 'strip-set-curls'),
      SCORING,
    )
    expect(result.score).toBeCloseTo((30 + 20 + 12 + 6) / 4, 10)
    expect(result.penalty).toBe(0)
    expect(result.drop).toBeNull()
  })
})

describe('sessionTotals', () => {
  it('totals Ab Ripper X reps (all-sum catalog ⇒ score is total reps)', () => {
    const def = getWorkout('ab-ripper-x')
    const session: Session = {
      programDayId: 'd001',
      entries: Object.fromEntries((def.exercises ?? []).map((e) => [e.id, entry([25, null])])),
    }
    const totals = sessionTotals(session, def, SCORING)
    expect(totals.entered).toBe(11)
    expect(totals.score).toBe(275)
    expect(totals.penalty).toBe(0)
  })

  it('rolls up only the exercises with data', () => {
    const def = getWorkout('chest-back')
    const session: Session = {
      programDayId: 'd001',
      entries: {
        'standard-push-ups': entry([22, null], [15, null]), // 18.5 − 3.5
        'heavy-pants': entry([10, 11], [12, 11]), // 12.1 − 0
      },
    }
    const totals = sessionTotals(session, def, SCORING)
    expect(totals.entered).toBe(2)
    expect(totals.score).toBeCloseTo(30.6, 10)
    expect(totals.penalty).toBeCloseTo(3.5, 10)
    expect(totals.net).toBeCloseTo(27.1, 10)
  })
})

describe('formatScore', () => {
  it('renders Excel-style trimmed decimals', () => {
    expect(formatScore(null)).toBe('—')
    expect(formatScore(18.5)).toBe('18.5')
    expect(formatScore(8)).toBe('8')
    expect(formatScore((11 + 13.2) / 2)).toBe('12.1') // float noise rounded away
    expect(formatScore(0.4999999999)).toBe('0.5')
  })
})

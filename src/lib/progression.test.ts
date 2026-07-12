/// <reference types="node" />
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { migrateToCurrent } from '@/lib/migrations'
import { getWorkout } from '@/lib/programData'
import { materialize } from '@/lib/schedule/materialize'
import { workoutProgression, workoutTotalTrend } from './progression'
import type { Session } from '@/lib/schema'

/**
 * Golden strength progression against the shipped sample. Shoulders & Arms is
 * logged on d003 (week 1) and d010 (week 2). Net values are hand-derived from
 * the catalog scoring rules: alternating-shoulder-presses (R×W ÷10) 9 → 10,
 * side-tri-rises ('extra', both sides sum) 18 → 20, crouching-cohen-curls
 * (R×W) 10.8. side-tri-rises is the single biggest jump (+2), so it tops the
 * movers ranking.
 */
function sampleFixture(workoutKey: string) {
  const raw: unknown = JSON.parse(
    readFileSync(path.resolve(process.cwd(), 'public', 'sample-data.json'), 'utf-8'),
  )
  const result = migrateToCurrent(raw)
  if (!result.ok) throw new Error(result.error)
  const { settings, scheduleOps, workoutLogs } = result.state
  const schedule = materialize(settings.program, settings.startDate!, scheduleOps)
  const sessions = new Map<string, Session>(
    (workoutLogs[workoutKey]?.sessions ?? []).map((s) => [s.programDayId, s]),
  )
  return { schedule, workout: getWorkout(workoutKey), sessions, scoring: settings.scoring }
}

function sampleProgression(workoutKey: string) {
  const { schedule, workout, sessions, scoring } = sampleFixture(workoutKey)
  return workoutProgression(schedule, workout, sessions, scoring)
}

describe('workoutProgression (Shoulders & Arms, sample)', () => {
  const prog = sampleProgression('shoulders-arms')

  it('anchors the x-axis on the workout occurrences in order', () => {
    expect(prog.occurrences[0].programDayId).toBe('d003')
    expect(prog.occurrences[1].programDayId).toBe('d010')
  })

  it('plots net (score − penalty) per occurrence, matching the engine', () => {
    const asp = prog.series.find((s) => s.exerciseId === 'alternating-shoulder-presses')!
    expect(asp.points[0]).toBeCloseTo(9, 10) // (10·10 + 9·10)/10 avg = 9.5, −0.5 drop
    expect(asp.points[1]).toBeCloseTo(10, 10)

    const ccc = prog.series.find((s) => s.exerciseId === 'crouching-cohen-curls')!
    expect(ccc.points[0]).toBeCloseTo(10.8, 10) // 12 vs 10.8 → 11.4 − 0.6
  })

  it('leaves gaps (null) for occurrences with no logged session', () => {
    const asp = prog.series.find((s) => s.exerciseId === 'alternating-shoulder-presses')!
    expect(asp.points.slice(2).every((p) => p === null)).toBe(true)
  })

  it('ranks side-tri-rises (+2) as the top mover', () => {
    const top = prog.topMovers[0]
    expect(top.exerciseId).toBe('side-tri-rises')
    expect(top.first).toBeCloseTo(18, 10)
    expect(top.latest).toBeCloseTo(20, 10)
    expect(top.delta).toBeCloseTo(2, 10)
  })
})

describe('workoutTotalTrend (Shoulders & Arms, sample)', () => {
  const { schedule, workout, sessions, scoring } = sampleFixture('shoulders-arms')
  const trend = workoutTotalTrend(schedule, workout, sessions, scoring)

  it('sums each logged session and leaves gaps elsewhere', () => {
    // week-1 and week-2 totals are the sums of the per-exercise nets asserted
    // above; every exercise in the sample sessions is logged
    const prog = workoutProgression(schedule, workout, sessions, scoring)
    const sum = (i: number) => prog.series.reduce((acc, s) => acc + (s.points[i] ?? 0), 0)
    expect(trend.totals[0]).toBeCloseTo(sum(0), 10)
    expect(trend.totals[1]).toBeCloseTo(sum(1), 10)
    expect(trend.totals.slice(2).every((t) => t === null)).toBe(true)
    expect(trend.occurrences).toHaveLength(trend.totals.length)
  })
})

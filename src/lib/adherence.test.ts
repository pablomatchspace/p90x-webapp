/// <reference types="node" />
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { migrateToCurrent } from '@/lib/migrations'
import { materialize } from '@/lib/schedule/materialize'
import { indexSessions } from '@/lib/schedule/status'
import { adherenceTrend, computeAdherence } from './adherence'

/**
 * Golden adherence roll-up against the shipped sample dataset (the exact file
 * users import via "Try sample data"). Clock is 2026-01-20 — the sample's
 * loggedAt — with start 2026-01-05 and one skip on 2026-01-14, so "today" is
 * program day 15. Every expected number below is hand-derived from the sample
 * logs against the Classic template.
 */
function sampleFixture() {
  const raw: unknown = JSON.parse(
    readFileSync(path.resolve(process.cwd(), 'public', 'sample-data.json'), 'utf-8'),
  )
  const result = migrateToCurrent(raw)
  if (!result.ok) throw new Error(result.error)
  const { settings, scheduleOps, workoutLogs } = result.state
  const schedule = materialize(settings.program, settings.startDate!, scheduleOps)
  return { schedule, index: indexSessions(workoutLogs), scheduleOps }
}

function sampleAdherence(today: string) {
  const { schedule, index, scheduleOps } = sampleFixture()
  return computeAdherence(schedule, index, scheduleOps, today)
}

describe('computeAdherence (sample dataset @ 2026-01-20)', () => {
  const a = sampleAdherence('2026-01-20')

  it('places the athlete on program day 15 of 90', () => {
    expect(a.programDays).toBe(90)
    expect(a.dayReached).toBe(15)
    expect(a.progress).toBeCloseTo(15 / 90, 10)
  })

  it('counts done vs scheduled over non-rest days to date', () => {
    expect(a.done).toBe(10)
    expect(a.missed).toBe(1) // d011 Yoga X marked "no"
    expect(a.partial).toBe(1) // d012 Legs & Back logged, its Ab Ripper X not
    expect(a.pending).toBe(1) // d015 is today, not yet logged
    expect(a.rest).toBe(2) // d007, d014
    expect(a.scheduled).toBe(13)
    expect(a.adherenceRate).toBeCloseTo(10 / 13, 10)
  })

  it('breaks the current streak at the recent miss and partial', () => {
    // d013 is done, but the d012 partial (then the d011 miss) cap the run at 1
    expect(a.currentStreak).toBe(1)
  })

  it('reports one active skip and the matching one-day slip', () => {
    expect(a.skips).toBe(1)
    expect(a.slipDays).toBe(1)
  })

  it('builds comparable weekly completion bars', () => {
    expect(a.weeks[0]).toMatchObject({ week: 1, scheduled: 6, done: 6, started: true })
    expect(a.weeks[0].ratio).toBeCloseTo(1, 10)
    expect(a.weeks[1]).toMatchObject({ week: 2, scheduled: 6, done: 4, started: true })
    expect(a.weeks[1].ratio).toBeCloseTo(4 / 6, 10)
    expect(a.weeks[2]).toMatchObject({ week: 3, done: 0, started: true })
    expect(a.weeks[3]).toMatchObject({ week: 4, done: 0, started: false })
  })

  it('is empty-safe before the program starts', () => {
    const before = sampleAdherence('2026-01-01')
    expect(before.dayReached).toBe(0)
    expect(before.scheduled).toBe(0)
    expect(before.adherenceRate).toBeNull()
    expect(before.currentStreak).toBe(0)
  })
})

describe('adherenceTrend (sample dataset @ 2026-01-20)', () => {
  const { schedule, index } = sampleFixture()
  const trend = adherenceTrend(schedule, index, '2026-01-20')

  it('emits one point per elapsed program day', () => {
    expect(trend).toHaveLength(15)
    expect(trend[0]).toEqual({ x: 1, y: 100 }) // day 1 done ⇒ 1/1
  })

  it('carries the rate through rest days and ends at the headline rate', () => {
    // day 7 is rest: same 6/6 = 100% as day 6
    expect(trend[6]).toEqual({ x: 7, y: 100 })
    // final point matches computeAdherence's 10/13 (pending today included)
    expect(trend[14].x).toBe(15)
    expect(trend[14].y).toBeCloseTo((10 / 13) * 100, 10)
  })

  it('is empty before the program starts', () => {
    expect(adherenceTrend(schedule, index, '2026-01-01')).toEqual([])
  })
})

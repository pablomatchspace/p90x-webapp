import { describe, expect, it } from 'vitest'
import {
  getTemplate,
  getWorkout,
  hasWorkout,
  hasWorkoutIn,
  loggableWorkoutsFor,
  programLabel,
  workoutsFor,
  type ProgramRef,
} from './programData'

const CLASSIC: ProgramRef = { suite: 'p90x', variant: 'classic' }
const LEAN: ProgramRef = { suite: 'p90x', variant: 'lean' }

describe('generated program assets (US-010)', () => {
  it('contains both 90-day templates with resolvable workout keys', () => {
    for (const program of [CLASSIC, LEAN]) {
      const days = getTemplate(program)
      expect(days).toHaveLength(90)
      days.forEach((d, i) => {
        expect(d.day).toBe(i + 1)
        expect(d.week).toBe(Math.floor(i / 7) + 1)
        expect([1, 2, 3]).toContain(d.phase)
        expect(d.workouts.length).toBeGreaterThan(0)
        for (const key of d.workouts)
          expect(hasWorkout(key), `${program.variant} day ${d.day}: ${key}`).toBe(true)
      })
    }
  })

  it('classic template matches the workbook schedule', () => {
    const classic = getTemplate(CLASSIC)
    expect(classic[0].workouts).toEqual(['chest-back', 'ab-ripper-x'])
    expect(classic[1].workouts).toEqual(['plyometrics'])
    expect(classic[6].workouts).toEqual(['rest'])
    // ARX pairs 3×/week in the 10 non-recovery weeks
    const arxDays = classic.filter((d) => d.workouts.includes('ab-ripper-x'))
    expect(arxDays).toHaveLength(30)
    expect(arxDays.every((d) => !d.recovery)).toBe(true)
    // recovery weeks 4, 8, 13
    expect(
      classic
        .filter((d) => d.recovery)
        .map((d) => d.week)
        .every((w) => [4, 8, 13].includes(w)),
    ).toBe(true)
    // phase boundaries
    expect(classic[27].phase).toBe(1) // day 28 (week 4)
    expect(classic[28].phase).toBe(2) // day 29 (week 5)
    expect(classic[56].phase).toBe(3) // day 57 (week 9)
  })

  it('lean template swaps in Core Synergistics and Cardio X', () => {
    const lean = getTemplate(LEAN)
    expect(lean[0].workouts).toEqual(['core-synergistics'])
    expect(lean[1].workouts).toEqual(['cardio-x'])
    expect(lean.some((d) => d.workouts.includes('plyometrics'))).toBe(false)
  })

  it('catalog exercise structures are well-formed', () => {
    expect(workoutsFor('p90x').map((w) => w.key)).toContain('chest-back')
    const cb = getWorkout('chest-back')
    expect(cb.exercises).toHaveLength(12)
    expect(cb.exercises![0]).toMatchObject({
      id: 'standard-push-ups',
      rounds: 2,
      secondary: 'knee',
      agg: 'avg',
    })
    const strip = getWorkout('back-biceps').exercises!.find((e) => e.id === 'strip-set-curls')!
    expect(strip.rounds).toBe(4)
    expect(strip.labels).toHaveLength(4)
    const arx = getWorkout('ab-ripper-x')
    expect(arx.style).toBe('arx')
    expect(arx.exercises).toHaveLength(11)
    for (const w of loggableWorkoutsFor('p90x')) {
      for (const e of w.exercises!) {
        expect(e.labels).toHaveLength(e.rounds)
        expect(['avg', 'sum']).toContain(e.agg)
      }
    }
    expect(() => getWorkout('nope')).toThrow()
  })
})

describe('program suites & variants (E33 U160)', () => {
  it('labels each program for display', () => {
    expect(programLabel(CLASSIC)).toBe('Classic')
    expect(programLabel(LEAN)).toBe('Lean')
  })

  it('scopes the catalog to a suite', () => {
    const p90x = workoutsFor('p90x').map((w) => w.key)
    expect(p90x).toContain('chest-back')
    expect(p90x.every((k) => !k.startsWith('gn-'))).toBe(true)
    expect(
      loggableWorkoutsFor('p90x').every((w) => w.style === 'strength' || w.style === 'arx'),
    ).toBe(true)
  })
})

describe('Generation Next program data (E33 U161, golden master vs BODi calendar + Dumbbell Tracker)', () => {
  const GN: ProgramRef = { suite: 'gennext', variant: 'standard' }
  const days = () => getTemplate(GN)
  const dayOf = (week: number, weekday: number) => days()[(week - 1) * 7 + (weekday - 1)]

  it('is a 90-day calendar whose week 13 has six days', () => {
    expect(days()).toHaveLength(90)
    expect(days().filter((d) => d.week === 13)).toHaveLength(6)
    days().forEach((d, i) => {
      expect(d.day).toBe(i + 1)
      expect(d.workouts).toHaveLength(1)
      expect(hasWorkout(d.workouts[0]), `day ${d.day}`).toBe(true)
    })
  })

  it('pins calendar cells from the PDF', () => {
    expect(dayOf(1, 1).workouts).toEqual(['gn-push-strength'])
    expect(dayOf(1, 2).workouts).toEqual(['gn-plyometrix'])
    expect(dayOf(4, 3).workouts).toEqual(['gn-core-circuit'])
    expect(dayOf(5, 2).workouts).toEqual(['gn-accel-decel'])
    // the PDF text layer misplaces "Myofascial Release" here; the page image reads Push Strength
    expect(dayOf(6, 3).workouts).toEqual(['gn-push-strength'])
    expect(dayOf(13, 6).workouts).toEqual(['gn-speed-and-agility'])
    for (let week = 1; week <= 12; week++) {
      expect(dayOf(week, 7).workouts).toEqual(['gn-myofascial-release'])
    }
  })

  it('flags weeks 4, 8 and 13 as recovery and splits three phases', () => {
    const recoveryWeeks = new Set(
      days()
        .filter((d) => d.recovery)
        .map((d) => d.week),
    )
    expect([...recoveryWeeks]).toEqual([4, 8, 13])
    expect(dayOf(4, 7).phase).toBe(1)
    expect(dayOf(5, 1).phase).toBe(2)
    expect(dayOf(9, 1).phase).toBe(3)
  })

  it('logs every move in video order: tracker dumbbell moves plus bodyweight moves (E36)', () => {
    const shape = (key: string) =>
      getWorkout(key).exercises!.map((e) => `${e.block}|${e.name}|${e.rounds}|${e.secondary ?? ''}`)
    expect(shape('gn-push-strength')).toEqual([
      'Block 1|Goblet Squat|3|weight',
      'Block 1|Narrow to Wide Push-Up|3|mod',
      'Block 1|Alternating Step Ups|3|weight',
      'Block 1|Wide Stance Rotational Push|3|weight',
      'Block 2|Sumo Squats|3|weight',
      'Block 2|Incline Bench Press|3|weight',
      'Block 2|Curtsey Lunges|3|weight',
      'Block 2|Push Press|3|weight',
      'Finisher|Squat Thruster|5|weight',
      'Finisher|Diamond Push-Up|5|mod',
      'Finisher|Bench Dip|5|mod',
    ])
    const counts = Object.fromEntries(
      loggableWorkoutsFor('gennext').map((w) => [w.key, w.exercises!.length]),
    )
    expect(counts).toEqual({
      'gn-upper-body': 13,
      'gn-lower-body': 11,
      'gn-push-strength': 11,
      'gn-pull-strength': 11,
      'gn-core-circuit': 5,
      'gn-full-body-strength': 12,
      'gn-full-body-power': 14,
    })
    for (const w of loggableWorkoutsFor('gennext')) {
      expect(w.pillar).toBe('MOT')
      for (const e of w.exercises!) {
        expect(e.agg).toBe('avg')
        expect(e.labels).toHaveLength(e.rounds)
      }
    }
  })

  it('follows the video where it differs from the tracker (E36)', () => {
    const rounds = (key: string, block: string) =>
      getWorkout(key)
        .exercises!.filter((e) => e.block === block)
        .map((e) => e.rounds)
    // EMOM finishers run 3 rounds on video (the tracker printed 5)
    expect(rounds('gn-full-body-strength', 'Finisher')).toEqual([2, 3, 3, 3])
    expect(rounds('gn-full-body-power', 'Finisher')).toEqual([3, 3])
    // ladder finishers keep 5 rungs; the accumulator logs its laps as rounds (cap 5)
    expect(rounds('gn-pull-strength', 'Finisher')).toEqual([5, 5, 5])
    expect(rounds('gn-full-body-power', 'Block 2')).toEqual([5, 5, 5])
  })

  it('logs holds in seconds and the AMRAP as rounds, without a modified count', () => {
    const fbp = getWorkout('gn-full-body-power').exercises!
    expect(fbp.find((e) => e.id === 'hollow-hold-sec')!.secondary).toBeUndefined()
    const amrap = getWorkout('gn-full-body-strength').exercises!.find(
      (e) => e.id === 'buy-in-cash-out-amrap-rounds',
    )!
    expect(amrap.secondary).toBeUndefined()
    expect(amrap.labels.map((l) => l.main)).toEqual(['Buy-in', 'Cash-out'])
  })

  it('carries pillars, completion-style cardio/recovery and five bonus workouts', () => {
    const gn = workoutsFor('gennext')
    expect(gn.every((w) => w.key.startsWith('gn-'))).toBe(true)
    expect(getWorkout('gn-plyometrix')).toMatchObject({ style: 'completion', pillar: 'NPT' })
    expect(getWorkout('gn-myofascial-release')).toMatchObject({
      style: 'completion',
      pillar: 'ART',
    })
    expect(gn.filter((w) => w.style === 'bonus').map((w) => w.key)).toEqual([
      'gn-bonus-abs',
      'gn-bonus-arms',
      'gn-bonus-classic-push-pull',
      'gn-bonus-glutes',
      'gn-bonus-shoulders',
    ])
    expect(programLabel(GN)).toBe('Generation Next')
  })
})

describe('hasWorkoutIn (E33 review)', () => {
  it('only resolves keys of the given suite', () => {
    expect(hasWorkoutIn('p90x', 'chest-back')).toBe(true)
    expect(hasWorkoutIn('p90x', 'gn-push-strength')).toBe(false)
    expect(hasWorkoutIn('gennext', 'gn-push-strength')).toBe(true)
    expect(hasWorkoutIn('gennext', 'chest-back')).toBe(false)
    expect(hasWorkoutIn('gennext', 'nope')).toBe(false)
  })
})

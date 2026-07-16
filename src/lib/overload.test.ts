import { describe, expect, it } from 'vitest'
import { getWorkout } from '@/lib/programData'
import { materialize } from '@/lib/schedule/materialize'
import { workoutOccurrences } from '@/lib/schedule/occurrences'
import { emptyState, type ArchivedRound, type ExerciseEntry, type Session } from '@/lib/schema'
import { archiveLatestNets, overloadTarget, targetStatus } from '@/lib/overload'

const scoring = emptyState().settings.scoring
const pushUps = getWorkout('chest-back').exercises!.find((e) => e.id === 'standard-push-ups')!

/** Two equal rounds of main+knee reps: net = main + knee/chairFactor, no penalty. */
function entry(main: number, knee = 0): ExerciseEntry {
  return {
    rounds: [
      { main, secondary: knee },
      { main, secondary: knee },
    ],
  }
}

function session(programDayId: string, main: number, knee = 0): Session {
  return { programDayId, entries: { 'standard-push-ups': entry(main, knee) } }
}

const schedule = materialize('classic', '2026-01-05', [])
const occurrences = workoutOccurrences(schedule, 'chest-back') // d001/d008/d015/d057/d071

function archive(id: string, sessions: Session[], chairFactor = 2): ArchivedRound {
  return {
    id,
    archivedAt: '2026-04-06T00:00:00Z',
    label: id,
    program: 'classic',
    startDate: '2026-01-05',
    scheduleOps: [],
    workoutLogs: sessions.length > 0 ? { 'chest-back': { sessions } } : {},
    bodyLog: [],
    snapshot: {
      age: null,
      height: null,
      startWeight: null,
      startBodyFat: null,
      limits: { weight: null, bodyFat: null, bmi: null },
      targets: { leanMassIncrease: null, bodyFat: null, ffmi: null },
      scoring: { ...scoring, chairFactor },
    },
  }
}

describe('overloadTarget (US-147)', () => {
  it('targets the latest earlier logged net, skipping unlogged occurrences', () => {
    // logged at occ 0 (net 20) and occ 1 (net 25); occ 2 unlogged; viewing occ 3
    const sessions = new Map([
      ['d001', session('d001', 20)],
      ['d008', session('d008', 25)],
    ])
    expect(overloadTarget(occurrences, sessions, 3, pushUps, scoring)).toEqual({
      net: 25,
      source: 'round',
      week: 2,
    })
  })

  it('is null on the first occurrence with no archives', () => {
    expect(overloadTarget(occurrences, new Map(), 0, pushUps, scoring)).toBeNull()
    expect(overloadTarget(occurrences, new Map(), 0, pushUps, scoring, null)).toBeNull()
  })

  it('falls back to the archive map when this round has no history', () => {
    const archiveNets = new Map([['standard-push-ups', 27]])
    expect(overloadTarget(occurrences, new Map(), 0, pushUps, scoring, archiveNets)).toEqual({
      net: 27,
      source: 'archive',
      week: null,
    })
    // this-round history still wins over the archive
    const sessions = new Map([['d001', session('d001', 20)]])
    expect(overloadTarget(occurrences, sessions, 1, pushUps, scoring, archiveNets)).toMatchObject({
      net: 20,
      source: 'round',
    })
  })
})

describe('archiveLatestNets (US-147)', () => {
  it('reads the newest archived round with data, using its frozen scoring', () => {
    const rounds = [
      archive('r-old', [session('d001', 40)]),
      // newest: latest logged occurrence is d008; chairFactor 1 ⇒ knee reps count fully
      archive('r-new', [session('d001', 10, 6), session('d008', 12, 6)], 1),
    ]
    const nets = archiveLatestNets(rounds, 'chest-back')
    expect(nets?.get('standard-push-ups')).toBe(18) // 12 + 6/1, not 12 + 6/2
  })

  it('skips newer archives without this workout and returns null when none has it', () => {
    const rounds = [archive('r-old', [session('d001', 40)]), archive('r-new', [])]
    expect(archiveLatestNets(rounds, 'chest-back')?.get('standard-push-ups')).toBe(40)
    expect(archiveLatestNets([archive('r-empty', [])], 'chest-back')).toBeNull()
  })
})

describe('targetStatus (US-147)', () => {
  const target = { net: 20, source: 'round' as const, week: 1 }
  it('covers pending / beaten / matched / behind', () => {
    expect(targetStatus(null, target)).toBe('pending')
    expect(targetStatus(20.5, target)).toBe('beaten')
    expect(targetStatus(20, target)).toBe('matched')
    expect(targetStatus(19, target)).toBe('behind')
  })
})

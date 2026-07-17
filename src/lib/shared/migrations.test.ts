import { describe, expect, it } from 'vitest'
import { migrateToCurrent } from './migrations'
import { emptyState, SCHEMA_VERSION } from './schema'

/** A faithful document at an older version: current empty state minus later fields. */
function docAt(version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11): Record<string, unknown> {
  const doc = JSON.parse(JSON.stringify(emptyState())) as {
    schemaVersion: number
    rounds?: unknown
    archivedRounds?: unknown
    settings: {
      timer?: unknown
      targets: Record<string, unknown>
      player?: Record<string, unknown>
      yoga?: unknown
      training?: unknown
      nutrition?: Record<string, unknown>
      workoutLinks?: unknown
    }
  }
  doc.schemaVersion = version
  // pre-v13 documents stored the archive under `rounds`
  doc.rounds = doc.archivedRounds
  delete doc.archivedRounds
  if (version < 12) delete doc.settings.player?.voiceHandsFree // v12 field
  if (version < 11) delete doc.rounds // v11 field
  if (version < 10) delete doc.settings.player?.voiceCues // v10 field
  if (version < 9) delete doc.settings.nutrition?.dietStyle // v9 field
  if (version < 8) delete doc.settings.workoutLinks // v8 field
  if (version < 7) delete doc.settings.nutrition // v7 field
  if (version < 6) delete doc.settings.training // v6 field
  if (version < 5) delete doc.settings.yoga // v5 field
  if (version < 4) delete doc.settings.player // v4 field
  if (version < 3) delete doc.settings.targets.ffmi // v3 field
  if (version < 2) delete doc.settings.timer // v2 field
  return doc
}

describe('migration pipeline', () => {
  it('upgrades a v1 document through every step', () => {
    const result = migrateToCurrent(docAt(1))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.schemaVersion).toBe(SCHEMA_VERSION)
      expect(result.state.settings.timer).toEqual({ workSeconds: 60, restSeconds: 60 })
      expect(result.state.settings.targets.ffmi).toBeNull()
      expect(result.state.settings.player).toEqual({
        autoMarkDone: false,
        voiceCues: true,
        voiceHandsFree: false,
      })
      expect(result.state.settings.yoga).toBe('classic')
      expect(result.state.settings.training).toBe('intermediate')
      expect(result.state.settings.nutrition).toEqual({
        phaseOverride: null,
        calorieOverride: null,
        dietStyle: 'balanced',
      })
      expect(result.state.settings.workoutLinks).toEqual({})
    }
  })

  it('upgrades a v2 document, keeping its timer and adding the ffmi target', () => {
    const doc = docAt(2)
    ;(doc.settings as { timer?: unknown }).timer = { workSeconds: 45, restSeconds: 90 }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.timer).toEqual({ workSeconds: 45, restSeconds: 90 })
      expect(result.state.settings.targets.ffmi).toBeNull()
      expect(result.state.settings.player).toEqual({
        autoMarkDone: false,
        voiceCues: true,
        voiceHandsFree: false,
      })
      expect(result.state.settings.yoga).toBe('classic')
    }
  })

  it('upgrades a v3 document, keeping custom timer/ffmi values and gaining player', () => {
    const doc = docAt(3)
    ;(doc.settings as { timer?: unknown }).timer = { workSeconds: 45, restSeconds: 90 }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.timer).toEqual({ workSeconds: 45, restSeconds: 90 })
      expect(result.state.settings.targets.ffmi).toBeNull()
      expect(result.state.settings.player).toEqual({
        autoMarkDone: false,
        voiceCues: true,
        voiceHandsFree: false,
      })
      expect(result.state.settings.yoga).toBe('classic')
    }
  })

  it('upgrades a v4 document, keeping custom player values and gaining yoga', () => {
    const doc = docAt(4)
    ;(doc.settings as { player?: unknown }).player = { autoMarkDone: true }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.player).toEqual({
        autoMarkDone: true,
        voiceCues: true,
        voiceHandsFree: false,
      })
      expect(result.state.settings.yoga).toBe('classic')
    }
  })

  it('upgrades a v5 document, keeping yoga and gaining training experience', () => {
    const doc = docAt(5)
    ;(doc.settings as { yoga?: unknown }).yoga = 'x3'
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.yoga).toBe('x3')
      expect(result.state.settings.training).toBe('intermediate')
      expect(result.state.settings.workoutLinks).toEqual({})
    }
  })

  it('upgrades a v7 document, keeping nutrition overrides and gaining empty workout links', () => {
    const doc = docAt(7)
    ;(doc.settings as { nutrition?: unknown }).nutrition = {
      phaseOverride: 2,
      calorieOverride: 2600,
    }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.nutrition).toEqual({
        phaseOverride: 2,
        calorieOverride: 2600,
        dietStyle: 'balanced',
      })
      expect(result.state.settings.workoutLinks).toEqual({})
    }
  })

  it('upgrades a v6 document, keeping training and gaining nutrition overrides', () => {
    const doc = docAt(6)
    ;(doc.settings as { training?: unknown }).training = 'advanced'
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.training).toBe('advanced')
      expect(result.state.settings.nutrition).toEqual({
        phaseOverride: null,
        calorieOverride: null,
        dietStyle: 'balanced',
      })
    }
  })

  it('upgrades a v8 document, keeping workout links and gaining the diet style', () => {
    const doc = docAt(8)
    ;(doc.settings as { nutrition?: unknown }).nutrition = {
      phaseOverride: 2,
      calorieOverride: 2100,
    }
    ;(doc.settings as { workoutLinks?: unknown }).workoutLinks = {
      'chest-back': { video: 'https://example.com/v' },
    }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.nutrition).toEqual({
        phaseOverride: 2,
        calorieOverride: 2100,
        dietStyle: 'balanced',
      })
      expect(result.state.settings.workoutLinks).toEqual({
        'chest-back': { video: 'https://example.com/v' },
      })
    }
  })

  it('upgrades a v9 document, keeping player prefs and gaining voice cues on', () => {
    const doc = docAt(9)
    ;(doc.settings as { player?: unknown }).player = { autoMarkDone: true }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.player).toEqual({
        autoMarkDone: true,
        voiceCues: true,
        voiceHandsFree: false,
      })
      expect(result.state.archivedRounds).toEqual([])
    }
  })

  it('upgrades a v10 document, gaining an empty archived-rounds list', () => {
    const result = migrateToCurrent(docAt(10))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.archivedRounds).toEqual([])
    }
  })

  it('upgrades a v11 document, keeping player prefs and gaining hands-free off', () => {
    const doc = docAt(11)
    ;(doc.settings as { player?: unknown }).player = { autoMarkDone: true, voiceCues: false }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.player).toEqual({
        autoMarkDone: true,
        voiceCues: false,
        voiceHandsFree: false,
      })
    }
  })

  it('never mutates the caller’s document', () => {
    const doc = docAt(1)
    migrateToCurrent(doc)
    expect(doc.schemaVersion).toBe(1)
  })

  it('passes a current document through unmigrated', () => {
    expect(migrateToCurrent(emptyState())).toMatchObject({ ok: true, migrated: false })
  })

  it('still rejects v0 and newer-than-current versions', () => {
    expect(migrateToCurrent({ schemaVersion: 0 }).ok).toBe(false)
    expect(migrateToCurrent({ schemaVersion: SCHEMA_VERSION + 1 }).ok).toBe(false)
  })
})

describe('v12 → v13 (E31 U156): ubiquitous-language field renames', () => {
  /** A faithful v12 document exercising every renamed field, live and archived. */
  function v12Doc(): Record<string, unknown> {
    const doc = JSON.parse(JSON.stringify(emptyState())) as Record<string, unknown>
    doc.schemaVersion = 12
    delete doc.archivedRounds
    const session = {
      programDayId: 'd001',
      status: 'yes',
      entries: { ex1: { rounds: [{ main: 10, secondary: 5 }] } },
    }
    doc.workoutLogs = { chestBack: { sessions: [JSON.parse(JSON.stringify(session))] } }
    doc.rounds = [
      {
        id: 'r1',
        archivedAt: '2026-01-01T00:00:00.000Z',
        label: 'Round 1',
        program: 'classic',
        startDate: '2025-10-01',
        scheduleOps: [],
        workoutLogs: { chestBack: { sessions: [JSON.parse(JSON.stringify(session))] } },
        bodyLog: [],
        snapshot: {
          age: null,
          height: null,
          startWeight: null,
          startBodyFat: null,
          limits: { weight: null, bodyFat: null, bmi: null },
          targets: { leanMassIncrease: null, bodyFat: null, ffmi: null },
          scoring: { penaltyDivisor: 2, penaltyOn: true, chairFactor: 2, rwDivisor: 10 },
        },
      },
    ]
    return doc
  }

  it('renames the top-level rounds archive to archivedRounds', () => {
    const result = migrateToCurrent(v12Doc())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.archivedRounds).toHaveLength(1)
      expect('rounds' in result.state).toBe(false)
    }
  })

  it('renames session.status to session.completion in live and archived logs', () => {
    const result = migrateToCurrent(v12Doc())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.workoutLogs.chestBack?.sessions[0]?.completion).toBe('yes')
      expect(result.state.archivedRounds[0]?.workoutLogs.chestBack?.sessions[0]?.completion).toBe(
        'yes',
      )
    }
  })

  it('renames exercise-round main/assist pair in live and archived entries', () => {
    const result = migrateToCurrent(v12Doc())
    expect(result.ok).toBe(true)
    if (result.ok) {
      const live = result.state.workoutLogs.chestBack?.sessions[0]?.entries?.ex1?.rounds[0]
      expect(live).toEqual({ reps: 10, assist: 5 })
      const archived =
        result.state.archivedRounds[0]?.workoutLogs.chestBack?.sessions[0]?.entries?.ex1?.rounds[0]
      expect(archived).toEqual({ reps: 10, assist: 5 })
    }
  })
})

describe('migration never throws on malformed-but-valid-JSON input', () => {
  /**
   * A hand-edited or partially-corrupted localStorage/import blob is valid
   * JSON but can have the wrong shape at any field. Every migration step must
   * degrade to a graceful `{ ok: false }` — never throw — so `loadState()`
   * (called at module-load time) can never crash the whole app on boot.
   */
  it('does not throw when the pre-v13 rounds archive is an object instead of an array', () => {
    const doc = {
      schemaVersion: 10,
      settings: JSON.parse(JSON.stringify(emptyState().settings)),
      scheduleOps: [],
      workoutLogs: {},
      bodyLog: [],
      rounds: {}, // malformed: valid JSON, wrong shape
      quotes: { disabledIds: [], custom: [] },
      notes: '',
    }
    expect(() => migrateToCurrent(doc)).not.toThrow()
    expect(migrateToCurrent(doc).ok).toBe(false)
  })

  it('does not throw when workoutLogs sessions/entries are malformed', () => {
    const doc = {
      schemaVersion: 12,
      settings: JSON.parse(JSON.stringify(emptyState().settings)),
      scheduleOps: [],
      workoutLogs: { chestBack: { sessions: 'not-an-array' } },
      bodyLog: [],
      archivedRounds: [],
      quotes: { disabledIds: [], custom: [] },
      notes: '',
    }
    expect(() => migrateToCurrent(doc)).not.toThrow()
    expect(migrateToCurrent(doc).ok).toBe(false)
  })

  it('does not throw when an archived round has a malformed workoutLogs shape', () => {
    const doc = {
      schemaVersion: 12,
      settings: JSON.parse(JSON.stringify(emptyState().settings)),
      scheduleOps: [],
      workoutLogs: {},
      bodyLog: [],
      archivedRounds: [{ id: 'r1', workoutLogs: null }],
      quotes: { disabledIds: [], custom: [] },
      notes: '',
    }
    expect(() => migrateToCurrent(doc)).not.toThrow()
    expect(migrateToCurrent(doc).ok).toBe(false)
  })
})

describe('migration never throws on malformed elements within otherwise-valid arrays', () => {
  /**
   * The container-shape guards (Array.isArray) aren't enough on their own —
   * a well-formed array can still contain a null/malformed element at any
   * depth of the workoutLogs → sessions → entries → rounds walk.
   */
  function baseDoc(workoutLogs: unknown) {
    return {
      schemaVersion: 12,
      settings: JSON.parse(JSON.stringify(emptyState().settings)),
      scheduleOps: [],
      workoutLogs,
      bodyLog: [],
      archivedRounds: [],
      quotes: { disabledIds: [], custom: [] },
      notes: '',
    }
  }

  it('does not throw when a workout log entry is null', () => {
    const doc = baseDoc({ chestBack: null })
    expect(() => migrateToCurrent(doc)).not.toThrow()
    expect(migrateToCurrent(doc).ok).toBe(false)
  })

  it('does not throw when a session in the sessions array is null', () => {
    const doc = baseDoc({ chestBack: { sessions: [null] } })
    expect(() => migrateToCurrent(doc)).not.toThrow()
    expect(migrateToCurrent(doc).ok).toBe(false)
  })

  it('does not throw when an entry in session.entries is null', () => {
    const doc = baseDoc({
      chestBack: { sessions: [{ programDayId: 'd001', entries: { ex1: null } }] },
    })
    expect(() => migrateToCurrent(doc)).not.toThrow()
    expect(migrateToCurrent(doc).ok).toBe(false)
  })

  it('does not throw when a round in entry.rounds is null', () => {
    const doc = baseDoc({
      chestBack: {
        sessions: [{ programDayId: 'd001', entries: { ex1: { rounds: [null] } } }],
      },
    })
    expect(() => migrateToCurrent(doc)).not.toThrow()
    expect(migrateToCurrent(doc).ok).toBe(false)
  })
})

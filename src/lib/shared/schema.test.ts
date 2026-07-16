import { describe, expect, it } from 'vitest'
import { migrateToCurrent } from './migrations'
import { appStateSchema, emptyState, SCHEMA_VERSION, type AppState } from './schema'
import { bodyFraction, kg, meters } from './units'

function populated(): AppState {
  const s = emptyState()
  s.settings.startDate = '2026-01-05'
  s.settings.age = 40
  s.settings.height = meters(1.8)
  s.settings.startWeight = kg(82)
  s.settings.startBodyFat = bodyFraction(0.22)
  s.scheduleOps.push({
    id: 'op1',
    kind: 'skip',
    date: '2026-01-14',
    createdAt: '2026-01-14T08:00:00Z',
  })
  s.scheduleOps.push({
    id: 'op2',
    kind: 'swap',
    dateA: '2026-01-20',
    dateB: '2026-01-21',
    createdAt: '2026-01-20T08:00:00Z',
    revertedAt: '2026-01-22T08:00:00Z',
  })
  s.scheduleOps.push({
    id: 'op3',
    kind: 'remap',
    fromWeek: 3,
    order: [6, 0, 1, 2, 3, 4, 5],
    createdAt: '2026-01-25T08:00:00Z',
  })
  s.workoutLogs['chest-back'] = {
    sessions: [
      {
        programDayId: 'd001',
        annotation: '1',
        completed: true,
        entries: {
          'standard-push-ups': {
            rounds: [
              { main: 20, secondary: 0 },
              { main: 15, secondary: 4 },
            ],
          },
        },
        notes: 'solid',
      },
    ],
  }
  s.bodyLog.push({
    date: '2026-01-06',
    weight: kg(82),
    bodyFat: bodyFraction(0.22),
    water: bodyFraction(0.55),
    bone: bodyFraction(0.04),
  })
  s.quotes.custom.push({ id: 'q-custom-1', text: 'One more rep.' })
  s.notes = 'free-form'
  return s
}

describe('appStateSchema', () => {
  it('accepts the empty state', () => {
    expect(appStateSchema.safeParse(emptyState()).success).toBe(true)
  })

  it('accepts a fully populated state and JSON round-trips losslessly', () => {
    const state = populated()
    const parsed = appStateSchema.parse(JSON.parse(JSON.stringify(state)))
    expect(parsed).toEqual(state)
  })

  it('strips unknown keys (forward compatibility)', () => {
    const raw = { ...emptyState(), futureField: 42 }
    const parsed = appStateSchema.parse(raw)
    expect('futureField' in parsed).toBe(false)
  })

  it('rejects malformed dates, ops and entries', () => {
    const badDate = { ...emptyState(), bodyLog: [{ date: '06/01/2026', weight: kg(80) }] }
    expect(appStateSchema.safeParse(badDate).success).toBe(false)

    const badOp = {
      ...emptyState(),
      scheduleOps: [{ id: 'x', kind: 'teleport', date: '2026-01-01', createdAt: 'now' }],
    }
    expect(appStateSchema.safeParse(badOp).success).toBe(false)

    const badRemap = {
      ...emptyState(),
      scheduleOps: [{ id: 'x', kind: 'remap', fromWeek: 1, order: [0, 1, 2], createdAt: 'now' }],
    }
    expect(appStateSchema.safeParse(badRemap).success).toBe(false)
  })
})

describe('migrateToCurrent', () => {
  it('passes a current-version document through', () => {
    const result = migrateToCurrent(populated())
    expect(result).toMatchObject({ ok: true, migrated: false })
  })

  it('rejects non-objects, missing versions, newer and unknown versions', () => {
    expect(migrateToCurrent('hi').ok).toBe(false)
    expect(migrateToCurrent(null).ok).toBe(false)
    expect(migrateToCurrent({}).ok).toBe(false)
    expect(migrateToCurrent({ schemaVersion: SCHEMA_VERSION + 1 }).ok).toBe(false)
    expect(migrateToCurrent({ schemaVersion: 0 }).ok).toBe(false)
  })

  it('reports where validation failed', () => {
    const broken = { ...emptyState(), settings: { ...emptyState().settings, program: 'doubles' } }
    const result = migrateToCurrent(broken)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('settings.program')
  })
})

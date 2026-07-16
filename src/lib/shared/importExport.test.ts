import { describe, expect, it } from 'vitest'
import { exportFilename, parseImport, serializeExport, summarize } from './importExport'
import { emptyState } from './schema'
import { kg } from './units'

function sampleState() {
  const s = emptyState()
  s.settings.startDate = '2026-01-05'
  s.scheduleOps.push({ id: 'op1', kind: 'skip', date: '2026-01-14', createdAt: 'x' })
  s.scheduleOps.push({
    id: 'op2',
    kind: 'skip',
    date: '2026-01-15',
    createdAt: 'x',
    revertedAt: 'y',
  })
  s.workoutLogs['chest-back'] = {
    sessions: [
      {
        programDayId: 'd001',
        entries: { 'standard-push-ups': { rounds: [{ main: 20, secondary: null }] } },
      },
    ],
  }
  s.bodyLog.push({ date: '2026-01-06', weight: kg(82) })
  s.notes = 'hi'
  return s
}

describe('summarize', () => {
  it('counts sessions, entries, body rows and only active skips', () => {
    expect(summarize(sampleState())).toEqual({
      program: 'classic',
      startDate: '2026-01-05',
      workoutCount: 1,
      sessionCount: 1,
      entryCount: 1,
      bodyCount: 1,
      skipCount: 1, // reverted skip not counted
      customQuotes: 0,
      hasNotes: true,
    })
  })
})

describe('parseImport / serializeExport', () => {
  it('round-trips losslessly (US-013 AC)', () => {
    const state = sampleState()
    const result = parseImport(serializeExport(state))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state).toEqual(state)
  })

  it('rejects non-JSON and wrong documents with readable errors', () => {
    expect(parseImport('{oops')).toMatchObject({ ok: false })
    const wrong = parseImport(JSON.stringify({ hello: 'world' }))
    expect(wrong.ok).toBe(false)
    if (!wrong.ok) expect(wrong.error).toContain('schemaVersion')
    const newer = parseImport(JSON.stringify({ schemaVersion: 99 }))
    expect(newer.ok).toBe(false)
    if (!newer.ok) expect(newer.error).toContain('newer')
  })
})

describe('exportFilename', () => {
  it('stamps the local date', () => {
    expect(exportFilename(new Date(2026, 6, 6))).toBe('p90x-data-20260706.json')
  })
})

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyState } from '@/lib/schema'
import {
  createDebouncedSaver,
  daysSinceExport,
  loadState,
  markExported,
  readBackup,
  saveState,
  writeBackup,
} from './persist'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('loadState', () => {
  it('returns empty state on first boot', () => {
    const { state, issue } = loadState()
    expect(issue).toBe('empty')
    expect(state).toEqual(emptyState())
  })

  it('round-trips a saved state', () => {
    const state = emptyState()
    state.notes = 'hello'
    expect(saveState(state)).toBe(true)
    const loaded = loadState()
    expect(loaded.issue).toBe('none')
    expect(loaded.state.notes).toBe('hello')
  })

  it('quarantines unparseable JSON and boots clean', () => {
    localStorage.setItem('p90x.state', '{not json')
    const { state, issue } = loadState()
    expect(issue).toBe('corrupt')
    expect(state).toEqual(emptyState())
    expect(localStorage.getItem('p90x.corrupt')).toBe('{not json')
    expect(localStorage.getItem('p90x.state')).toBeNull()
  })

  it('quarantines schema-invalid documents', () => {
    localStorage.setItem('p90x.state', JSON.stringify({ schemaVersion: 999 }))
    const { issue } = loadState()
    expect(issue).toBe('corrupt')
    expect(localStorage.getItem('p90x.corrupt')).toContain('999')
  })
})

describe('saveState under storage failure', () => {
  it('returns false when the write throws (quota/private mode)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(saveState(emptyState())).toBe(false)
  })
})

describe('backup envelope', () => {
  it('writes and reads back with reason and timestamp', () => {
    const state = emptyState()
    state.notes = 'precious'
    expect(writeBackup(state, 'import')).toBe(true)
    const backup = readBackup()
    expect(backup?.reason).toBe('import')
    expect(backup?.state.notes).toBe('precious')
    expect(Date.parse(backup?.savedAt ?? '')).not.toBeNaN()
  })

  it('returns null for missing or invalid backups', () => {
    expect(readBackup()).toBeNull()
    localStorage.setItem('p90x.backup', '{broken')
    expect(readBackup()).toBeNull()
  })
})

describe('export tracking', () => {
  it('computes days since export', () => {
    expect(daysSinceExport()).toBeNull()
    markExported(new Date('2026-07-01T10:00:00Z'))
    expect(daysSinceExport(new Date('2026-07-09T10:00:00Z'))).toBe(8)
  })
})

describe('createDebouncedSaver', () => {
  it('collapses rapid schedules into one write and reports success', () => {
    vi.useFakeTimers()
    const results: boolean[] = []
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const saver = createDebouncedSaver((ok) => results.push(ok), 300)
    const state = emptyState()
    saver.schedule(state)
    saver.schedule(state)
    saver.schedule(state)
    expect(setItem).not.toHaveBeenCalled()
    vi.advanceTimersByTime(301)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(results).toEqual([true])
    vi.useRealTimers()
  })

  it('flush writes immediately and is a no-op when nothing is pending', () => {
    vi.useFakeTimers()
    const results: boolean[] = []
    const saver = createDebouncedSaver((ok) => results.push(ok), 300)
    saver.flush()
    expect(results).toEqual([])
    saver.schedule(emptyState())
    saver.flush()
    expect(results).toEqual([true])
    vi.advanceTimersByTime(1000)
    expect(results).toEqual([true]) // timer cleared, no double write
    vi.useRealTimers()
  })
})

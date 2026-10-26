import { describe, expect, it } from 'vitest'
import { emptyState } from '@/lib/shared'
import { beginProgram, canStartProgram } from './program'

/**
 * Program-lifecycle invariant (US-084), extracted from the application layer:
 * a program exists exactly when startDate is non-null, and starting never
 * overwrites an existing program — re-anchoring goes through setStartDate.
 */

describe('canStartProgram', () => {
  it('is true only while no program exists', () => {
    const settings = emptyState().settings
    expect(canStartProgram(settings)).toBe(true)
    settings.startDate = '2026-01-05'
    expect(canStartProgram(settings)).toBe(false)
  })
})

describe('beginProgram', () => {
  it('sets program and day 1 on a fresh document', () => {
    const settings = emptyState().settings
    expect(beginProgram(settings, '2026-01-05', { suite: 'p90x', variant: 'lean' })).toBe(true)
    expect(settings.startDate).toBe('2026-01-05')
    expect(settings.program).toEqual({ suite: 'p90x', variant: 'lean' })
  })

  it('refuses to overwrite an existing program', () => {
    const settings = emptyState().settings
    beginProgram(settings, '2026-01-05', { suite: 'p90x', variant: 'classic' })
    expect(beginProgram(settings, '2026-02-02', { suite: 'p90x', variant: 'lean' })).toBe(false)
    expect(settings.startDate).toBe('2026-01-05')
    expect(settings.program).toEqual({ suite: 'p90x', variant: 'classic' })
  })
})

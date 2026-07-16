// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyState } from '@/lib/shared'
import { setCompletionStatus } from '@/state/actions'
import { clock, resetClock, setClock } from '@/state/ports'
import { useStore } from '@/state/store'

/**
 * The clock port: actions stamp loggedAt/createdAt/archivedAt through
 * `clock.nowISO()` instead of `new Date()` directly, so use-cases are
 * deterministic under test and the dependency is explicit.
 */

const T = '2026-03-01T08:30:00.000Z'

beforeEach(() => {
  useStore.setState({ data: emptyState() })
})

afterEach(() => {
  resetClock()
})

describe('clock port', () => {
  it('defaults to real time in ISO-8601 shape', () => {
    expect(clock.nowISO()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('actions stamp timestamps through the injected clock', () => {
    setClock({ nowISO: () => T })
    setCompletionStatus('cardio-x', 'd002', 'yes')
    const session = useStore.getState().data.workoutLogs['cardio-x']?.sessions[0]
    expect(session?.loggedAt).toBe(T)
  })

  it('resetClock restores the real clock', () => {
    setClock({ nowISO: () => T })
    resetClock()
    expect(clock.nowISO()).not.toBe(T)
  })
})

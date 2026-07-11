import { describe, expect, it } from 'vitest'
import {
  extendPlayback,
  pausePlayback,
  remainingMs,
  resumePlayback,
  skipPhase,
  startPlayback,
  tickPlayback,
} from './playback'

const OPTS = { stepCount: 3, workSeconds: 60, restSeconds: 30 }
const T0 = 1_000_000

describe('playback engine', () => {
  it('starts in a work phase ending workSeconds later', () => {
    expect(startPlayback(0, 60, T0)).toEqual({
      phase: 'work',
      stepIndex: 0,
      endsAt: T0 + 60_000,
      pausedMs: null,
    })
  })

  it('returns the same reference mid-phase', () => {
    const s = startPlayback(0, 60, T0)
    const r = tickPlayback(s, OPTS, T0 + 59_999)
    expect(r.state).toBe(s)
    expect(r.event).toBeNull()
  })

  it('work end → rest on the SAME step', () => {
    const r = tickPlayback(startPlayback(0, 60, T0), OPTS, T0 + 60_000)
    expect(r.event).toBe('rest-started')
    expect(r.state).toEqual({
      phase: 'rest',
      stepIndex: 0,
      endsAt: T0 + 90_000,
      pausedMs: null,
    })
  })

  it('rest end → work on the NEXT step', () => {
    const rest = { phase: 'rest' as const, stepIndex: 0, endsAt: T0, pausedMs: null }
    const r = tickPlayback(rest, OPTS, T0)
    expect(r.event).toBe('step-advanced')
    expect(r.state).toEqual({
      phase: 'work',
      stepIndex: 1,
      endsAt: T0 + 60_000,
      pausedMs: null,
    })
  })

  it('work end on the last step finishes — no trailing rest', () => {
    const last = { phase: 'work' as const, stepIndex: 2, endsAt: T0, pausedMs: null }
    expect(tickPlayback(last, OPTS, T0)).toEqual({ state: null, event: 'sequence-finished' })
  })

  it('pause freezes remaining time; ticks no-op; resume restores', () => {
    const s = startPlayback(0, 60, T0)
    const paused = pausePlayback(s, T0 + 10_000)
    expect(paused.pausedMs).toBe(50_000)
    expect(paused.endsAt).toBeNull()
    expect(tickPlayback(paused, OPTS, T0 + 999_999).state).toBe(paused)
    const resumed = resumePlayback(paused, T0 + 100_000)
    expect(resumed.endsAt).toBe(T0 + 150_000)
    expect(remainingMs(resumed, T0 + 100_000)).toBe(50_000)
  })

  it('pause/resume are idempotent no-ops when already in that mode', () => {
    const s = startPlayback(0, 60, T0)
    expect(resumePlayback(s, T0)).toBe(s)
    const paused = pausePlayback(s, T0 + 10_000)
    expect(pausePlayback(paused, T0 + 20_000)).toBe(paused)
  })

  it('+10 s extends a running phase and a paused one', () => {
    const s = startPlayback(0, 60, T0)
    expect(extendPlayback(s, 10_000).endsAt).toBe(T0 + 70_000)
    const paused = pausePlayback(s, T0 + 10_000)
    expect(extendPlayback(paused, 10_000).pausedMs).toBe(60_000)
  })

  it('skip force-completes the phase, running or paused', () => {
    const s = startPlayback(0, 60, T0)
    const r = skipPhase(s, OPTS, T0 + 5_000)
    expect(r.event).toBe('rest-started')
    expect(r.state?.endsAt).toBe(T0 + 35_000)
    const paused = pausePlayback(s, T0 + 5_000)
    const r2 = skipPhase(paused, OPTS, T0 + 8_000)
    expect(r2.event).toBe('rest-started')
    expect(r2.state?.endsAt).toBe(T0 + 38_000)
  })

  it('remainingMs clamps at zero', () => {
    expect(remainingMs(startPlayback(0, 60, T0), T0 + 61_000)).toBe(0)
  })
})

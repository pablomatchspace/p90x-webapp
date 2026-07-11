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

describe('per-step overrides (E16)', () => {
  it('stepSeconds respected on rest-end advance', () => {
    const opts = { stepCount: 3, workSeconds: 60, restSeconds: 30, stepSeconds: [45, 90, 60] }
    const rest = { phase: 'rest' as const, stepIndex: 0, endsAt: T0, pausedMs: null }
    const r = tickPlayback(rest, opts, T0)
    expect(r.event).toBe('step-advanced')
    expect(r.state?.phase).toBe('work')
    expect(r.state?.stepIndex).toBe(1)
    expect(r.state?.endsAt).toBe(T0 + 90_000)
  })

  it('restAfter per-boundary duration', () => {
    const opts = { stepCount: 3, workSeconds: 60, restSeconds: 30, restAfter: [10, 20, 30] }
    const work = startPlayback(0, 60, T0)
    const r = tickPlayback(work, opts, T0 + 60_000)
    expect(r.event).toBe('rest-started')
    expect(r.state?.endsAt).toBe(T0 + 70_000)
  })

  it('restAfter: 0 ⇒ work-end advances straight to next work with step-advanced', () => {
    const opts = {
      stepCount: 3,
      workSeconds: 60,
      restSeconds: 30,
      restAfter: [0, 30, 30],
      stepSeconds: [60, 45, 60],
    }
    const work = startPlayback(0, 60, T0)
    const r = tickPlayback(work, opts, T0 + 60_000)
    expect(r.event).toBe('step-advanced')
    expect(r.state?.phase).toBe('work')
    expect(r.state?.stepIndex).toBe(1)
    expect(r.state?.endsAt).toBe(T0 + 105_000)
  })

  it('mixed array with holes falls back to uniforms', () => {
    // Short arrays: index 0 only → steps 1,2,3 are holes (undefined at runtime) → fall back to uniforms.
    const opts = { stepCount: 4, workSeconds: 60, restSeconds: 30, stepSeconds: [60], restAfter: [30, 0] }
    const work0 = startPlayback(0, 60, T0)
    const r0 = tickPlayback(work0, opts, T0 + 60_000)
    expect(r0.state?.endsAt).toBe(T0 + 90_000) // restAfter[0]=30
    const rest1 = { phase: 'rest' as const, stepIndex: 1, endsAt: T0, pausedMs: null }
    const r1 = tickPlayback(rest1, opts, T0)
    expect(r1.state?.endsAt).toBe(T0 + 60_000) // stepSeconds[2] is a hole → falls back to workSeconds=60
    const work2 = { phase: 'work' as const, stepIndex: 2, endsAt: T0, pausedMs: null }
    const r2 = tickPlayback(work2, opts, T0 + 60_000)
    expect(r2.state?.endsAt).toBe(T0 + 90_000) // restAfter[2] is a hole → falls back to restSeconds=30
  })

  it('skipPhase across a zero-rest boundary lands on next step work', () => {
    const opts = {
      stepCount: 3,
      workSeconds: 60,
      restSeconds: 30,
      restAfter: [0, 30, 30],
      stepSeconds: [60, 45, 60],
    }
    const work = startPlayback(0, 60, T0)
    const r = skipPhase(work, opts, T0 + 30_000)
    expect(r.event).toBe('step-advanced')
    expect(r.state?.phase).toBe('work')
    expect(r.state?.stepIndex).toBe(1)
    expect(r.state?.endsAt).toBe(T0 + 75_000)
  })

  it('uniform-only opts produce results identical to pre-E16 fixtures (regression pin)', () => {
    const opts = { stepCount: 3, workSeconds: 60, restSeconds: 30 }
    const work = startPlayback(0, 60, T0)
    const r = tickPlayback(work, opts, T0 + 60_000)
    expect(r).toEqual({
      state: { phase: 'rest', stepIndex: 0, endsAt: T0 + 90_000, pausedMs: null },
      event: 'rest-started',
    })
  })
})

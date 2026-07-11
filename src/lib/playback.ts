/**
 * Pure focus-playback engine (E12): work → rest (same step) → work (next step)
 * … → finished after the last step's work (no trailing rest). Every function
 * takes `now` (epoch ms) — no Date.now() inside, so tests are exact and the UI
 * drives it from an interval. Invariant: `endsAt === null` ⇔ paused, with the
 * remaining time parked in `pausedMs`.
 */
export type PlaybackPhase = 'work' | 'rest'

export interface PlaybackState {
  phase: PlaybackPhase
  stepIndex: number
  endsAt: number | null
  pausedMs: number | null
}

export interface PlaybackOpts {
  stepCount: number
  workSeconds: number
  restSeconds: number
}

export type PlaybackEvent = 'rest-started' | 'step-advanced' | 'sequence-finished'

export interface TickResult {
  /** null when the sequence finished */
  state: PlaybackState | null
  event: PlaybackEvent | null
}

export function startPlayback(stepIndex: number, workSeconds: number, now: number): PlaybackState {
  return { phase: 'work', stepIndex, endsAt: now + workSeconds * 1000, pausedMs: null }
}

export function pausePlayback(state: PlaybackState, now: number): PlaybackState {
  if (state.endsAt === null) return state
  return { ...state, endsAt: null, pausedMs: Math.max(0, state.endsAt - now) }
}

export function resumePlayback(state: PlaybackState, now: number): PlaybackState {
  if (state.pausedMs === null) return state
  return { ...state, endsAt: now + state.pausedMs, pausedMs: null }
}

/** +N ms onto whichever phase is counting — running or paused. */
export function extendPlayback(state: PlaybackState, ms: number): PlaybackState {
  if (state.pausedMs !== null) return { ...state, pausedMs: state.pausedMs + ms }
  if (state.endsAt !== null) return { ...state, endsAt: state.endsAt + ms }
  return state
}

export function remainingMs(state: PlaybackState, now: number): number {
  if (state.pausedMs !== null) return state.pausedMs
  return state.endsAt === null ? 0 : Math.max(0, state.endsAt - now)
}

/** Returns the SAME state reference when nothing changed (cheap no-op detect). */
export function tickPlayback(state: PlaybackState, opts: PlaybackOpts, now: number): TickResult {
  if (state.pausedMs !== null || state.endsAt === null || now < state.endsAt) {
    return { state, event: null }
  }
  if (state.phase === 'work') {
    if (state.stepIndex >= opts.stepCount - 1) {
      return { state: null, event: 'sequence-finished' }
    }
    return {
      state: {
        phase: 'rest',
        stepIndex: state.stepIndex,
        endsAt: now + opts.restSeconds * 1000,
        pausedMs: null,
      },
      event: 'rest-started',
    }
  }
  return {
    state: {
      phase: 'work',
      stepIndex: state.stepIndex + 1,
      endsAt: now + opts.workSeconds * 1000,
      pausedMs: null,
    },
    event: 'step-advanced',
  }
}

/** Force-complete the current phase (works while paused too). */
export function skipPhase(state: PlaybackState, opts: PlaybackOpts, now: number): TickResult {
  const running = state.pausedMs === null ? state : resumePlayback(state, now)
  return tickPlayback({ ...running, endsAt: now }, opts, now)
}

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
  /** E16: per-step work-duration overrides (index = stepIndex); missing entry → workSeconds */
  stepSeconds?: number[]
  /** E16: rest after step i; missing entry → restSeconds; 0 ⇒ skip the rest phase entirely */
  restAfter?: number[]
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

/** E16: resolve work duration for a step (override or uniform). */
const workFor = (opts: PlaybackOpts, step: number): number =>
  opts.stepSeconds?.[step] ?? opts.workSeconds

/** E16: resolve rest duration after a step (override or uniform). */
const restFor = (opts: PlaybackOpts, step: number): number =>
  opts.restAfter?.[step] ?? opts.restSeconds

/** Returns the SAME state reference when nothing changed (cheap no-op detect). */
export function tickPlayback(state: PlaybackState, opts: PlaybackOpts, now: number): TickResult {
  if (state.pausedMs !== null || state.endsAt === null || now < state.endsAt) {
    return { state, event: null }
  }
  if (state.phase === 'work') {
    if (state.stepIndex >= opts.stepCount - 1) {
      return { state: null, event: 'sequence-finished' }
    }
    // E16: per-step rest duration; 0 ⇒ skip rest phase entirely
    const rest = restFor(opts, state.stepIndex)
    if (rest <= 0) {
      return {
        state: {
          phase: 'work',
          stepIndex: state.stepIndex + 1,
          endsAt: now + workFor(opts, state.stepIndex + 1) * 1000,
          pausedMs: null,
        },
        event: 'step-advanced',
      }
    }
    return {
      state: {
        phase: 'rest',
        stepIndex: state.stepIndex,
        endsAt: now + rest * 1000,
        pausedMs: null,
      },
      event: 'rest-started',
    }
  }
  // E16: per-step work duration for the next step
  return {
    state: {
      phase: 'work',
      stepIndex: state.stepIndex + 1,
      endsAt: now + workFor(opts, state.stepIndex + 1) * 1000,
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

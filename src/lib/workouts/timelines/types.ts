/**
 * Authored play timelines (E16): the in-video interval sequence for
 * completion-style workouts, hand-transcribed from docs/requirements/*.md
 * (the oracle). Video/UX data — never part of the generated catalog. Nothing
 * here is persisted; sessions store only status/notes/exerciseDone (US-044 + Q21c).
 */
export interface PlaySegment {
  /** unique within the timeline (kebab-case, split/round-suffixed) */
  id: string
  /** groups split segments and round repeats of the same move (Q21c log key) */
  exerciseId: string
  name: string
  /** null = untimed (manual advance; first used by E17 Kenpo — no null in Plyo) */
  seconds: number | null
  kind: 'exercise' | 'break'
  /** authored get-ready gap BEFORE this segment (Q13b); default 0 */
  leadIn?: number
  /** rep target for untimed segments (E17+) */
  reps?: number
  cue?: string
  section: string
}

export interface PlayTimeline {
  workoutKey: string
  /** variant discriminator (E19 yoga 'classic' | 'x3') */
  variant?: string
  title: string
  source: string
  segments: PlaySegment[]
  /** exerciseIds tracked done/skipped (Q21c); authored explicitly per timeline */
  loggedExerciseIds: string[]
}

import type { PlayTimeline } from './types'
import { cardioX } from './cardioX'
import { kenpoX } from './kenpoX'
import { plyometrics } from './plyometrics'
import { xStretch } from './xStretch'

/**
 * Registry of authored play timelines (E16/E17/E18). Pure data lookup — no side
 * effects. Each timeline attaches to a completion-style workout by `workoutKey`;
 * a workout may carry multiple variants (E19 yoga classic/x3) resolved via
 * `getTimeline`.
 */
const TIMELINES: PlayTimeline[] = [plyometrics, kenpoX, xStretch, cardioX]

export function hasTimeline(workoutKey: string): boolean {
  return TIMELINES.some((t) => t.workoutKey === workoutKey)
}

/** All timelines for a workout key (e.g. yoga variants). Empty if none. */
export function timelinesFor(workoutKey: string): PlayTimeline[] {
  return TIMELINES.filter((t) => t.workoutKey === workoutKey)
}

/** Resolve one timeline, optionally by variant; falls back to the first. */
export function getTimeline(workoutKey: string, variant?: string): PlayTimeline | null {
  const matches = timelinesFor(workoutKey)
  if (matches.length === 0) return null
  if (variant === undefined) return matches[0]
  return matches.find((t) => t.variant === variant) ?? matches[0]
}

export type { PlayTimeline, PlaySegment } from './types'

import type { PlayTimeline } from './types'
import { cardioX } from './cardioX'
import { kenpoX } from './kenpoX'
import { plyometrics } from './plyometrics'
import { xStretch } from './xStretch'
import { yogaClassic } from './yogaClassic'
import { yogaX3 } from './yogaX3'
import { gnActiveFlexibility, gnActiveMobility, gnMyofascialRelease } from './gennext/art'
import {
  gnBonusAbs,
  gnBonusArms,
  gnBonusClassicPushPull,
  gnBonusGlutes,
  gnBonusShoulders,
} from './gennext/bonus'
import { gnAccelDecel, gnCardioBoxing, gnPlyometrix, gnSpeedAndAgility } from './gennext/npt'

/**
 * Registry of authored play timelines (E16/E17/E18/E19). Pure data lookup — no side
 * effects. Each timeline attaches to a completion-style workout by `workoutKey`;
 * a workout may carry multiple variants (E19 yoga classic/x3) resolved via
 * `getTimeline`.
 */
const TIMELINES: PlayTimeline[] = [
  plyometrics,
  kenpoX,
  xStretch,
  cardioX,
  yogaClassic,
  yogaX3,
  // E34 Generation Next — completion + bonus workouts (strength days use focus mode)
  gnPlyometrix,
  gnSpeedAndAgility,
  gnAccelDecel,
  gnCardioBoxing,
  gnActiveMobility,
  gnActiveFlexibility,
  gnMyofascialRelease,
  gnBonusAbs,
  gnBonusArms,
  gnBonusClassicPushPull,
  gnBonusGlutes,
  gnBonusShoulders,
]

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

/**
 * Summary-checklist labels, one per logged exercise id. A label is the move's
 * segment name; when one id spans differently-named segments (clockwise /
 * counterclockwise) the shared text before " — " is used, and when two ids
 * would still collide (Plank Reset right/left) the id's last word is appended.
 */
export function loggedLabels(timeline: PlayTimeline): Map<string, string> {
  const base = new Map<string, string>()
  for (const id of timeline.loggedExerciseIds) {
    const names = [
      ...new Set(timeline.segments.filter((s) => s.exerciseId === id).map((s) => s.name)),
    ]
    const label =
      names.length === 0
        ? id.replace(/-/g, ' ')
        : names.length === 1
          ? names[0]
          : names[0].split(' — ')[0]
    base.set(id, label)
  }
  const counts = new Map<string, number>()
  for (const label of base.values()) counts.set(label, (counts.get(label) ?? 0) + 1)
  const out = new Map<string, string>()
  for (const [id, label] of base) {
    out.set(id, (counts.get(label) ?? 0) > 1 ? `${label} — ${id.split('-').at(-1)}` : label)
  }
  return out
}

export type { PlayTimeline, PlaySegment } from './types'

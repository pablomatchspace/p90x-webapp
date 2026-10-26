import type { PlaySegment } from '../types'

/**
 * E34 helpers for Generation Next timelines. The videos are regular interval
 * formats (moves × rounds, fixed work/rest), so timelines are authored as
 * compact specs and expanded here instead of hand-listing every segment.
 */
export type Move = readonly [id: string, name: string, cue?: string]

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function rest(section: string, n: number, seconds: number): PlaySegment {
  return {
    id: `${slug(section)}-rest-${n}`,
    exerciseId: 'rest',
    name: 'Rest',
    seconds,
    kind: 'break',
    section,
  }
}

/** Each move once, back to back, for `seconds` (warm-ups, stretches, rolls). */
export function flow(section: string, moves: readonly Move[], seconds: number): PlaySegment[] {
  return moves.map(([id, name, cue]) => ({
    id: `${slug(section)}-${id}`,
    exerciseId: id,
    name,
    seconds,
    kind: 'exercise' as const,
    section,
    ...(cue !== undefined ? { cue } : {}),
  }))
}

/** Untimed rep targets — advance with Done. */
export function reps(section: string, moves: readonly Move[], count: number): PlaySegment[] {
  return flow(section, moves, 0).map((s) => ({ ...s, seconds: null, reps: count }))
}

/**
 * A block: all moves in order, repeated `rounds` times, `work` seconds each
 * with `rest` seconds between intervals (none after the block's last one).
 */
export function block(
  section: string,
  moves: readonly Move[],
  rounds: number,
  work: number,
  restSeconds: number,
): PlaySegment[] {
  const out: PlaySegment[] = []
  let n = 0
  for (let round = 1; round <= rounds; round++) {
    for (const [id, name, note] of moves) {
      if (out.length > 0 && restSeconds > 0) out.push(rest(section, ++n, restSeconds))
      const cue = [rounds > 1 ? `Round ${round} of ${rounds}` : null, note]
        .filter(Boolean)
        .join(' · ')
      out.push({
        id: `${slug(section)}-${id}-r${round}`,
        exerciseId: id,
        name,
        seconds: work,
        kind: 'exercise',
        section,
        ...(cue !== '' ? { cue } : {}),
      })
    }
  }
  return out
}

export const ids = (moves: readonly Move[]) => moves.map(([id]) => id)

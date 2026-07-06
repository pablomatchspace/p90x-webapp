/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { migrateToCurrent } from '@/lib/migrations'
import { getWorkout, hasWorkout } from '@/lib/programData'

/**
 * Local-only converter validation (US-011 / US-080 parity support).
 * Runs only when a personal p90x-data.json exists next to (or above) the
 * repo — that file is gitignored, so in CI this suite is skipped.
 */
const candidates = [
  path.resolve(process.cwd(), 'p90x-data.json'),
  path.resolve(process.cwd(), '..', 'p90x-data.json'),
]
const localFile = candidates.find((p) => existsSync(p))

describe.skipIf(!localFile)('local converter output', () => {
  it('validates against the app schema and references real program slots', () => {
    const raw: unknown = JSON.parse(readFileSync(localFile!, 'utf-8'))
    const result = migrateToCurrent(raw)
    expect(result.ok, result.ok ? '' : result.error).toBe(true)
    if (!result.ok) return
    const state = result.state

    expect(state.settings.startDate).not.toBeNull()
    expect(state.scheduleOps.every((op) => op.kind === 'skip')).toBe(true)

    let sessions = 0
    for (const [key, log] of Object.entries(state.workoutLogs)) {
      expect(hasWorkout(key), `workout ${key}`).toBe(true)
      const workout = getWorkout(key)
      const validIds = new Set((workout.exercises ?? []).map((e) => e.id))
      for (const session of log.sessions) {
        sessions += 1
        expect(session.programDayId).toMatch(/^d0\d{2}$/)
        for (const [exId, entry] of Object.entries(session.entries ?? {})) {
          expect(validIds.has(exId), `${key}/${exId}`).toBe(true)
          expect(entry.rounds.length).toBeGreaterThan(0)
        }
      }
    }
    expect(sessions).toBeGreaterThan(0)
    expect(state.bodyLog.length).toBeGreaterThan(0)
    // eslint-disable-next-line no-console
    console.log(
      `local data OK: ${sessions} sessions across ${Object.keys(state.workoutLogs).length} workouts, ` +
        `${state.bodyLog.length} body entries, ${state.scheduleOps.length} skips`,
    )
  })
})

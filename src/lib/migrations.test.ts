import { describe, expect, it } from 'vitest'
import { migrateToCurrent } from './migrations'
import { emptyState, SCHEMA_VERSION } from './schema'

/** A faithful v1 document: today's empty state minus everything v2 added. */
function v1Doc(): Record<string, unknown> {
  const doc = JSON.parse(JSON.stringify(emptyState())) as {
    schemaVersion: number
    settings: Record<string, unknown>
  }
  doc.schemaVersion = 1
  delete doc.settings.timer
  return doc
}

describe('migration pipeline', () => {
  it('upgrades a v1 document to current, adding timer defaults', () => {
    const result = migrateToCurrent(v1Doc())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.schemaVersion).toBe(SCHEMA_VERSION)
      expect(result.state.settings.timer).toEqual({ workSeconds: 60, restSeconds: 60 })
    }
  })

  it('never mutates the caller’s document', () => {
    const doc = v1Doc()
    migrateToCurrent(doc)
    expect(doc.schemaVersion).toBe(1)
    expect((doc as { settings: Record<string, unknown> }).settings.timer).toBeUndefined()
  })

  it('passes a current document through unmigrated', () => {
    const result = migrateToCurrent(emptyState())
    expect(result).toMatchObject({ ok: true, migrated: false })
  })

  it('still rejects v0 and newer-than-current versions', () => {
    expect(migrateToCurrent({ schemaVersion: 0 }).ok).toBe(false)
    expect(migrateToCurrent({ schemaVersion: SCHEMA_VERSION + 1 }).ok).toBe(false)
  })
})

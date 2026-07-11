import { describe, expect, it } from 'vitest'
import { migrateToCurrent } from './migrations'
import { emptyState, SCHEMA_VERSION } from './schema'

/** A faithful document at an older version: current empty state minus later fields. */
function docAt(version: 1 | 2): Record<string, unknown> {
  const doc = JSON.parse(JSON.stringify(emptyState())) as {
    schemaVersion: number
    settings: { timer?: unknown; targets: Record<string, unknown> }
  }
  doc.schemaVersion = version
  delete doc.settings.targets.ffmi // v3 field
  if (version === 1) delete doc.settings.timer // v2 field
  return doc
}

describe('migration pipeline', () => {
  it('upgrades a v1 document through every step', () => {
    const result = migrateToCurrent(docAt(1))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.schemaVersion).toBe(SCHEMA_VERSION)
      expect(result.state.settings.timer).toEqual({ workSeconds: 60, restSeconds: 60 })
      expect(result.state.settings.targets.ffmi).toBeNull()
    }
  })

  it('upgrades a v2 document, keeping its timer and adding the ffmi target', () => {
    const doc = docAt(2)
    ;(doc.settings as { timer?: unknown }).timer = { workSeconds: 45, restSeconds: 90 }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.timer).toEqual({ workSeconds: 45, restSeconds: 90 })
      expect(result.state.settings.targets.ffmi).toBeNull()
    }
  })

  it('never mutates the caller’s document', () => {
    const doc = docAt(1)
    migrateToCurrent(doc)
    expect(doc.schemaVersion).toBe(1)
  })

  it('passes a current document through unmigrated', () => {
    expect(migrateToCurrent(emptyState())).toMatchObject({ ok: true, migrated: false })
  })

  it('still rejects v0 and newer-than-current versions', () => {
    expect(migrateToCurrent({ schemaVersion: 0 }).ok).toBe(false)
    expect(migrateToCurrent({ schemaVersion: SCHEMA_VERSION + 1 }).ok).toBe(false)
  })
})

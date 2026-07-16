// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { emptyState } from '@/lib/shared'
import { readBackup } from './persist'
import { onStoreEvent, useStore } from './store'

beforeEach(() => {
  localStorage.clear()
  useStore.setState((s) => ({ ...s, data: emptyState(), bootIssue: 'none' as const }))
})

describe('store', () => {
  it('mutate produces a new immutable data reference', () => {
    const before = useStore.getState().data
    useStore.getState().mutate((d) => {
      d.notes = 'changed'
    })
    const after = useStore.getState().data
    expect(after.notes).toBe('changed')
    expect(after).not.toBe(before)
    expect(before.notes).toBe('')
  })

  it('replaceData swaps state and backs up the outgoing document', () => {
    useStore.getState().mutate((d) => {
      d.notes = 'old data'
    })
    const next = emptyState()
    next.notes = 'imported'
    useStore.getState().replaceData(next, 'import')
    expect(useStore.getState().data.notes).toBe('imported')
    const backup = readBackup()
    expect(backup?.reason).toBe('import')
    expect(backup?.state.notes).toBe('old data')
  })

  it('resetAll returns to empty state with a backup', () => {
    useStore.getState().mutate((d) => {
      d.notes = 'precious'
    })
    useStore.getState().resetAll()
    expect(useStore.getState().data).toEqual(emptyState())
    expect(readBackup()?.state.notes).toBe('precious')
  })

  it('restoreBackup round-trips through replaceData', () => {
    useStore.getState().mutate((d) => {
      d.notes = 'version A'
    })
    const next = emptyState()
    next.notes = 'version B'
    useStore.getState().replaceData(next, 'import')
    expect(useStore.getState().restoreBackup()).toBe(true)
    expect(useStore.getState().data.notes).toBe('version A')
  })

  it('restoreBackup returns false when no backup exists', () => {
    expect(useStore.getState().restoreBackup()).toBe(false)
  })
})

describe('store lifecycle events', () => {
  it('emits reset when resetAll runs', () => {
    let fired = 0
    const off = onStoreEvent('reset', () => {
      fired += 1
    })
    useStore.getState().resetAll()
    expect(fired).toBe(1)
    off()
  })

  it('emits documentReplaced when replaceData runs', () => {
    let fired = 0
    const off = onStoreEvent('documentReplaced', () => {
      fired += 1
    })
    useStore.getState().replaceData(emptyState(), 'test')
    expect(fired).toBe(1)
    off()
  })

  it('unsubscribing stops delivery', () => {
    let fired = 0
    const off = onStoreEvent('reset', () => {
      fired += 1
    })
    off()
    useStore.getState().resetAll()
    expect(fired).toBe(0)
  })
})

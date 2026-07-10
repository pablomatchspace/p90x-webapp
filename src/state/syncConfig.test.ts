// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearSyncConfig,
  loadSyncConfig,
  saveSyncConfig,
  type SyncConfig,
} from '@/state/syncConfig'

const config: SyncConfig = {
  endpoint: 'https://p90x-sync.example.workers.dev',
  passphrase: 'a good passphrase',
  salt: 'c2FsdA==',
  deviceId: 'device-1',
  deviceName: 'Desktop',
  lastRevision: 3,
  dirty: false,
  pausedReason: null,
}

afterEach(() => {
  localStorage.clear()
})

describe('sync config persistence', () => {
  it('round-trips through its own key', () => {
    expect(saveSyncConfig(config)).toBe(true)
    expect(loadSyncConfig()).toEqual(config)
  })

  it('is stored outside the app document, so exports never carry it', () => {
    saveSyncConfig(config)
    expect(localStorage.getItem('p90x.state')).toBeNull()
    expect(localStorage.getItem('p90x.sync')).toContain('p90x-sync.example.workers.dev')
  })

  it('returns null when never enabled', () => {
    expect(loadSyncConfig()).toBeNull()
  })

  it('returns null for unparseable or invalid stored config rather than throwing', () => {
    localStorage.setItem('p90x.sync', '{not json')
    expect(loadSyncConfig()).toBeNull()
    localStorage.setItem('p90x.sync', JSON.stringify({ ...config, lastRevision: -1 }))
    expect(loadSyncConfig()).toBeNull()
    localStorage.setItem('p90x.sync', JSON.stringify({ ...config, pausedReason: 'whenever' }))
    expect(loadSyncConfig()).toBeNull()
  })

  it('keeps a paused reason', () => {
    saveSyncConfig({ ...config, pausedReason: 'after-reset' })
    expect(loadSyncConfig()?.pausedReason).toBe('after-reset')
  })

  it('clears', () => {
    saveSyncConfig(config)
    clearSyncConfig()
    expect(loadSyncConfig()).toBeNull()
  })
})

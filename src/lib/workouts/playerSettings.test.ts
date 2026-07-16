import { describe, expect, it } from 'vitest'
import { emptyState } from '@/lib/shared'
import { applyPlayerPatch, applyTimerPatch } from './playerSettings'

/**
 * Play-mode settings guards (E12/E16), extracted from the application layer.
 * Live mutation bypasses Zod, so invalid values are corrected rather than
 * stored: timer seconds clamp to whole 5–3600, player flags coerce to boolean.
 */

describe('applyTimerPatch', () => {
  it('clamps and rounds to whole seconds in 5–3600', () => {
    const timer = emptyState().settings.timer
    applyTimerPatch(timer, { workSeconds: 2.4, restSeconds: 9999 })
    expect(timer).toEqual({ workSeconds: 5, restSeconds: 3600 })
    applyTimerPatch(timer, { workSeconds: 45.6 })
    expect(timer.workSeconds).toBe(46)
  })

  it('ignores non-finite values and untouched keys', () => {
    const timer = emptyState().settings.timer
    applyTimerPatch(timer, { workSeconds: Number.NaN })
    expect(timer).toEqual({ workSeconds: 60, restSeconds: 60 })
  })
})

describe('applyPlayerPatch', () => {
  it('coerces provided flags to booleans and leaves the rest', () => {
    const player = emptyState().settings.player
    applyPlayerPatch(player, { autoMarkDone: 1 as unknown as boolean })
    expect(player).toEqual({ autoMarkDone: true, voiceCues: true, voiceHandsFree: false })
  })
})

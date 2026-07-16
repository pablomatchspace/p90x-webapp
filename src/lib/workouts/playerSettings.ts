import type { Settings } from '@/lib/shared'

/**
 * Play-mode settings guards (E12/E16/E26/E30). Live mutation bypasses Zod, so
 * invalid values are corrected rather than stored: timer seconds clamp to
 * whole 5–3600; player flags coerce to booleans.
 */

export function applyTimerPatch(timer: Settings['timer'], patch: Partial<Settings['timer']>): void {
  for (const key of ['workSeconds', 'restSeconds'] as const) {
    const value = patch[key]
    if (value !== undefined && Number.isFinite(value)) {
      timer[key] = Math.min(3600, Math.max(5, Math.round(value)))
    }
  }
}

export function applyPlayerPatch(
  player: Settings['player'],
  patch: Partial<Settings['player']>,
): void {
  if (patch.autoMarkDone !== undefined) player.autoMarkDone = Boolean(patch.autoMarkDone)
  if (patch.voiceCues !== undefined) player.voiceCues = Boolean(patch.voiceCues)
  if (patch.voiceHandsFree !== undefined) player.voiceHandsFree = Boolean(patch.voiceHandsFree)
}

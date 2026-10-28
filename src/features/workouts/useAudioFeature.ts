import { useEffect } from 'react'
import { useFeature } from '@/state/selectors'
import { setAudioEnabled } from './audio'

/**
 * E41: keep the audio module's master switch in step with Features → "Beeps and
 * spoken cues". Mounted by every screen that plays a cue (Focus, Play, the rest
 * timer), so the audio module never needs the store itself. Returns the flag.
 */
export function useAudioFeature(): boolean {
  const enabled = useFeature('audio')
  useEffect(() => {
    setAudioEnabled(enabled)
  }, [enabled])
  return enabled
}

import { useEffect } from 'react'

/**
 * Hold the screen awake while `active` is true; re-acquire the wake lock when
 * the tab becomes visible again (E12 focus play, E16 workout play). Extracted
 * from FocusPage so both play screens share one implementation (Q16).
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    const acquire = () => {
      navigator.wakeLock
        .request('screen')
        .then((s) => {
          sentinel = s
        })
        .catch(() => {})
    }
    acquire()
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only cares whether a session is active
  }, [active])
}

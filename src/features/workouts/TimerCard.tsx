import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/Page'
import { updateTimerSettings } from '@/state/actions'
import { useSettings } from '@/state/selectors'
import { beep, mmss } from './timerUtils'

const PRESETS = [30, 60, 90, 120]

/**
 * Rest/interval timer (US-046): presets or custom seconds, beep + vibration
 * (feature-detected) and a screen wake lock while running. Used standalone on
 * More → Rest timer and embedded in focus mode.
 */
export function TimerCard() {
  const restDefault = useSettings().timer.restSeconds
  const [duration, setDuration] = useState(restDefault)
  const [remaining, setRemaining] = useState<number | null>(null) // null = idle at `duration`
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const endRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        setRunning(false)
        setDone(true)
        beep()
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
      }
    }, 200)
    return () => clearInterval(id)
  }, [running])

  // keep the screen awake mid-rest where the platform supports it
  useEffect(() => {
    if (!running || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    navigator.wakeLock
      .request('screen')
      .then((s) => {
        sentinel = s
      })
      .catch(() => {})
    return () => {
      void sentinel?.release().catch(() => {})
    }
  }, [running])

  const start = () => {
    const seconds = remaining !== null && remaining > 0 && !done ? remaining : duration
    endRef.current = Date.now() + seconds * 1000
    setRemaining(seconds)
    setDone(false)
    setRunning(true)
  }
  const reset = () => {
    setRunning(false)
    setRemaining(null)
    setDone(false)
  }
  const pick = (seconds: number) => {
    updateTimerSettings({ restSeconds: seconds })
    setDuration(seconds)
    setRunning(false)
    setRemaining(null)
    setDone(false)
  }

  const shown = remaining ?? duration
  const chip = (selected: boolean) =>
    `rounded-lg border px-3 py-2 text-sm font-medium ${
      selected
        ? 'border-red-600 bg-red-600 text-white'
        : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
    }`

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Rest timer</h2>
        <span
          role="timer"
          aria-label="Time remaining"
          className={`text-2xl font-bold tabular-nums ${
            done ? 'text-emerald-600 dark:text-emerald-400' : ''
          }`}
        >
          {mmss(shown)}
        </span>
      </div>
      <p aria-live="polite" className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
        {done ? "Time's up — back to work!" : ' '}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {PRESETS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            aria-pressed={duration === seconds}
            onClick={() => pick(seconds)}
            className={chip(duration === seconds)}
          >
            {seconds} s
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Custom
          <input
            type="text"
            inputMode="numeric"
            aria-label="Custom seconds"
            value={PRESETS.includes(duration) ? '' : String(duration)}
            placeholder="s"
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isInteger(n) && n >= 5 && n <= 3600) pick(n)
            }}
            className="h-10 w-16 rounded-lg border border-zinc-300 bg-white px-2 text-center text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {running ? (
          <button
            type="button"
            onClick={() => setRunning(false)}
            className="rounded-lg bg-zinc-700 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-500"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Start
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Reset
        </button>
      </div>
    </Card>
  )
}

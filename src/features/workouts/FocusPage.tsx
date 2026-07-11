import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { formatLong } from '@/lib/dates'
import { getWorkout, hasWorkout, type WorkoutDef } from '@/lib/programData'
import {
  extendPlayback,
  pausePlayback,
  remainingMs,
  resumePlayback,
  skipPhase,
  startPlayback,
  tickPlayback,
  type PlaybackState,
} from '@/lib/playback'
import { workoutOccurrences } from '@/lib/schedule/occurrences'
import { formatScore, scoreExercise, sessionTotals } from '@/lib/scoring'
import { setWorkoutCompleted, updateTimerSettings } from '@/state/actions'
import { useSchedule, useScoringSettings, useSettings, useWorkoutSessions } from '@/state/selectors'
import { QuoteCard } from '@/features/dashboard/QuoteCard'
import { focusSteps, resumeIndex } from '@/lib/focusSteps'
import { SECONDARY_LABELS } from './entryLabels'
import { RoundInputs } from './entryUi'
import { TimerCard } from './TimerCard'
import { beep, mmss } from './timerUtils'

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const coords = points
    .map((p, i) => `${(i / (points.length - 1)) * 100},${26 - ((p - min) / range) * 22}`)
    .join(' ')
  return (
    <svg
      viewBox="0 0 100 28"
      className="h-7 w-28 text-red-500"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={coords}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * One-exercise-at-a-time entry that follows the video's rhythm (US-043):
 * ordered cards with prev/next, progress, history sparkline and an embedded
 * rest timer; finishing marks the session complete and shows totals + PRs.
 */
export function FocusPage() {
  const params = useParams<{ key: string; programDayId: string }>()
  const key = params.key ?? ''
  const programDayId = params.programDayId ?? ''
  const valid = hasWorkout(key)
  const def = valid ? getWorkout(key) : null
  const steps = def === null ? [] : focusSteps(def)

  const schedule = useSchedule()
  const sessions = useWorkoutSessions(key)
  const scoring = useScoringSettings()
  const session = sessions.get(programDayId)
  const [idx, setIdx] = useState(() => resumeIndex(steps, session))
  const [finished, setFinished] = useState(false)
  const settings = useSettings()
  const [playback, setPlayback] = useState<PlaybackState | null>(null)
  const [playDone, setPlayDone] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const playbackOpts = {
    stepCount: steps.length,
    workSeconds: settings.timer.workSeconds,
    restSeconds: settings.timer.restSeconds,
  }

  const applyTick = (result: { state: PlaybackState | null; event: string | null }) => {
    if (result.event !== null) {
      beep()
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
    }
    if (result.event === 'step-advanced' && result.state !== null) setIdx(result.state.stepIndex)
    if (result.event === 'sequence-finished') setPlayDone(true)
    setPlayback(result.state)
  }

  useEffect(() => {
    if (playback === null || playback.pausedMs !== null) return
    const id = setInterval(() => {
      const now = Date.now()
      setNowTick(now)
      const result = tickPlayback(playback, playbackOpts, now)
      if (result.state !== playback || result.event !== null) applyTick(result)
    }, 200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- interval is rebuilt on every playback change by design
  }, [playback, steps.length, settings.timer.workSeconds, settings.timer.restSeconds])

  // hold the screen awake for the whole play session; re-acquire on tab return
  useEffect(() => {
    if (playback === null || !('wakeLock' in navigator)) return
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
  }, [playback === null])

  if (!valid) return <Navigate to="/workouts" replace />
  if (schedule === null) return <Navigate to={`/workouts/${key}`} replace />
  const occurrences = workoutOccurrences(schedule, key)
  const occIndex = occurrences.findIndex((d) => d.programDayId === programDayId)
  if (occIndex < 0) return <Navigate to={`/workouts/${key}`} replace />

  const exercises = def?.exercises ?? []
  if (steps.length === 0) return <Navigate to={`/workouts/${key}`} replace />
  const day = occurrences[occIndex]
  const step = steps[Math.min(idx, steps.length - 1)]
  const exercise = step.exercise
  const prior =
    step.rounds.length === 1 && step.rounds[0] > 0
      ? session?.entries?.[exercise.id]?.rounds[step.rounds[0] - 1]
      : undefined
  const result = scoreExercise(session?.entries?.[exercise.id], exercise, scoring)
  const isArx = def?.style === 'arx'

  const historyNets = (exerciseId: string, through: number): number[] => {
    const points: number[] = []
    for (let i = 0; i <= through; i++) {
      const net = scoreExercise(
        sessions.get(occurrences[i].programDayId)?.entries?.[exerciseId],
        exercises.find((e) => e.id === exerciseId) ?? exercise,
        scoring,
      ).net
      if (net !== null) points.push(net)
    }
    return points
  }

  const finish = () => {
    setWorkoutCompleted(key, programDayId, true)
    setFinished(true)
  }

  const onPlay = () => {
    setPlayDone(false)
    const now = Date.now()
    setNowTick(now)
    setPlayback(startPlayback(idx, settings.timer.workSeconds, now))
  }
  const onPause = () => setPlayback((p) => (p === null ? p : pausePlayback(p, Date.now())))
  const onResume = () => setPlayback((p) => (p === null ? p : resumePlayback(p, Date.now())))
  const onExtend = () => setPlayback((p) => (p === null ? p : extendPlayback(p, 10_000)))
  const onSkip = () => {
    if (playback === null) return
    applyTick(skipPhase(playback, playbackOpts, Date.now()))
  }
  const onStop = () => {
    setPlayback(null)
    setPlayDone(false)
  }

  const nextStep =
    playback !== null && playback.phase === 'rest' && playback.stepIndex + 1 < steps.length
      ? steps[playback.stepIndex + 1]
      : null

  const ghostBtn =
    'rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'

  if (finished) {
    const totals = sessionTotals(sessions.get(programDayId), def as WorkoutDef, scoring)
    const anyHistory = exercises.some((e) => historyNets(e.id, occIndex - 1).length > 0)
    const prs = exercises.filter((e) => {
      const current = scoreExercise(sessions.get(programDayId)?.entries?.[e.id], e, scoring).net
      if (current === null) return false
      const previous = historyNets(e.id, occIndex - 1)
      return previous.length > 0 && current > Math.max(...previous)
    })
    return (
      <Page title={def?.name ?? ''} subtitle={`Week ${day.week} · ${formatLong(day.date)}`}>
        <Card>
          <h2 className="text-lg font-semibold">Workout complete 🎉</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {isArx ? (
              <>
                Total reps: <strong className="tabular-nums">{formatScore(totals.score)}</strong>
              </>
            ) : (
              <>
                Session score <strong className="tabular-nums">{formatScore(totals.score)}</strong>
                {totals.penalty > 0 ? <> · penalties −{formatScore(totals.penalty)}</> : null} · net{' '}
                <strong className="tabular-nums">{formatScore(totals.net)}</strong>
              </>
            )}{' '}
            · {totals.entered} of {exercises.length} exercises logged
          </p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {!anyHistory
              ? 'First logged session — every rep sets the baseline.'
              : prs.length === 0
                ? 'No PRs this time — the baseline holds.'
                : `${prs.length} PR${prs.length === 1 ? '' : 's'} vs last time: ${prs
                    .slice(0, 4)
                    .map((e) => e.name)
                    .join(', ')}${prs.length > 4 ? '…' : ''}`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/today"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Back to Today
            </Link>
            <Link to={`/workouts/${key}?day=${programDayId}`} className={ghostBtn}>
              Open grid
            </Link>
          </div>
        </Card>
        <QuoteCard seed={day.day} label="Fuel for next time" />
      </Page>
    )
  }

  const sparkPoints = historyNets(exercise.id, occIndex)

  return (
    <Page
      title={def?.name ?? ''}
      subtitle={`Focus mode · Week ${day.week} · ${formatLong(day.date)}`}
      actions={
        <Link
          to={`/workouts/${key}?day=${programDayId}`}
          className="flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Exit
        </Link>
      }
    >
      <Card>
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            Step {idx + 1} of {steps.length}
            {step.rounds.length === 1 && exercise.rounds > 1
              ? ` · Round ${step.rounds[0] + 1}`
              : null}
          </span>
          {sparkPoints.length >= 2 ? (
            <span className="flex items-center gap-2">
              History <Sparkline points={sparkPoints} />
            </span>
          ) : null}
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-red-600 transition-all"
            style={{ width: `${((idx + 1) / steps.length) * 100}%` }}
          />
        </div>

        <h2 className="mt-4 text-xl font-semibold">{exercise.name}</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          {result.score === null
            ? 'Nothing entered yet — ghosts show last time.'
            : `Score ${formatScore(result.score)}${
                !isArx && result.penalty !== null && result.penalty > 0
                  ? ` · penalty ${formatScore(result.penalty)}`
                  : ''
              }`}
        </p>
        {prior !== undefined &&
        ((prior.main ?? null) !== null || (prior.secondary ?? null) !== null) ? (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Round {step.rounds[0]}: {prior.main ?? '—'}
            {exercise.secondary !== undefined
              ? ` · ${SECONDARY_LABELS[exercise.secondary]}: ${prior.secondary ?? '—'}`
              : null}
          </p>
        ) : null}

        <div className="mt-4">
          <RoundInputs
            workoutKey={key}
            exercise={exercise}
            occurrences={occurrences}
            occIndex={occIndex}
            sessions={sessions}
            drop={result.drop}
            rounds={step.rounds}
          />
        </div>

        {playback === null ? (
          <>
            {playDone ? (
              <p className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Sequence complete — review your entries, then finish below.
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className={ghostBtn}
                disabled={idx === 0}
                onClick={() => setIdx(idx - 1)}
              >
                Previous
              </button>
              {idx < steps.length - 1 ? (
                <button
                  type="button"
                  className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
                  onClick={() => setIdx(idx + 1)}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  onClick={finish}
                >
                  Finish workout
                </button>
              )}
              <button
                type="button"
                onClick={onPlay}
                className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Play
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>Work slot:</span>
              {[30, 45, 60, 90].map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  aria-pressed={settings.timer.workSeconds === seconds}
                  onClick={() => updateTimerSettings({ workSeconds: seconds })}
                  className={`rounded-lg border px-2.5 py-1.5 font-medium ${
                    settings.timer.workSeconds === seconds
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  Work {seconds} s
                </button>
              ))}
              <span>
                · Rest between steps: {settings.timer.restSeconds} s — set it on the rest timer
                below.
              </span>
            </div>
          </>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold tracking-wide uppercase ${
                playback.phase === 'work' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {playback.phase === 'work' ? 'Work' : 'Rest'}
            </span>
            <span
              role="timer"
              aria-label="Sequence time remaining"
              className="text-2xl font-bold tabular-nums"
            >
              {mmss(Math.ceil(remainingMs(playback, nowTick) / 1000))}
            </span>
            {nextStep !== null ? (
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                Rest — up next: {nextStep.exercise.name}
                {nextStep.rounds.length === 1 && nextStep.exercise.rounds > 1
                  ? ` · Round ${nextStep.rounds[0] + 1}`
                  : null}
              </span>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {playback.pausedMs === null ? (
                <button type="button" onClick={onPause} className={ghostBtn}>
                  Pause
                </button>
              ) : (
                <button type="button" onClick={onResume} className={ghostBtn}>
                  Resume
                </button>
              )}
              <button type="button" onClick={onExtend} className={ghostBtn}>
                +10 s
              </button>
              <button type="button" onClick={onSkip} className={ghostBtn}>
                Skip
              </button>
              <button type="button" onClick={onStop} className={ghostBtn}>
                Stop
              </button>
            </div>
          </div>
        )}
      </Card>

      <TimerCard />
    </Page>
  )
}

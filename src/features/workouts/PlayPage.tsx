import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { formatLong } from '@/lib/dates'
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
import { getWorkout, hasWorkout } from '@/lib/programData'
import { workoutOccurrences } from '@/lib/schedule/occurrences'
import { getTimeline, timelinesFor } from '@/lib/timelines'
import type { PlaySegment, PlayTimeline } from '@/lib/timelines'
import {
  setCompletionStatus,
  setExerciseDone,
  setSessionNotes,
  updatePlayerSettings,
} from '@/state/actions'
import { useSchedule, useSettings, useWorkoutLinks, useWorkoutSessions } from '@/state/selectors'
import { MediaLinks } from './MediaLinks'
import { beep, mmss, speak } from './timerUtils'
import { useWakeLock } from './playerHooks'

const ghostBtn =
  'rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'

/**
 * Guided in-video workout play (E16): runs an authored interval timeline for a
 * completion-style workout — 5s get-ready gaps between exercises, a beep at every
 * switch, per-jump done/skipped logging (Q21c), and an optional auto-mark-done
 * setting (Q17). One engine: `playback.ts` with per-step durations + skippable
 * rests (Q15A). FocusPage stays strength-only (Q16).
 */
export function PlayPage() {
  const params = useParams<{ key: string; programDayId: string }>()
  const key = params.key ?? ''
  const programDayId = params.programDayId ?? ''
  const valid = hasWorkout(key)

  const schedule = useSchedule()
  const sessions = useWorkoutSessions(key)
  const settings = useSettings()
  const session = sessions.get(programDayId)
  const links = useWorkoutLinks(key)

  // Local variant override (e.g. choice between classic vs x3 Yoga). One-off, not persisted.
  const [chosenVariant, setChosenVariant] = useState<string | undefined>(undefined)

  // Sync with default persisted setting on load
  useEffect(() => {
    if (key === 'yoga-x') {
      setChosenVariant(settings.yoga)
    }
  }, [settings.yoga, key])

  const timeline: PlayTimeline | null = useMemo(() => {
    if (!valid) return null
    return getTimeline(key, chosenVariant)
  }, [valid, key, chosenVariant])

  // Memoized so derived arrays keep stable refs across renders (timeline is a
  // stable module constant), satisfying exhaustive-deps without churn.
  const segments: PlaySegment[] = useMemo(() => timeline?.segments ?? [], [timeline])
  const loggedIds: string[] = useMemo(() => timeline?.loggedExerciseIds ?? [], [timeline])

  const [idx, setIdx] = useState(0)
  const [playback, setPlayback] = useState<PlaybackState | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [finished, setFinished] = useState(false)
  const [doneMap, setDoneMap] = useState<Map<string, boolean>>(() => new Map())

  // E16/E17 engine opts: each segment's work duration is authored; a null
  // duration (untimed rep drill) passes straight through so the engine enters
  // a wait. A rest phase exists ONLY where the next segment authored a
  // get-ready `leadIn` (Q13b).
  const opts = useMemo(
    () => ({
      stepCount: segments.length,
      workSeconds: 0,
      restSeconds: 0,
      stepSeconds: segments.map((s) => s.seconds),
      restAfter: segments.map((_s, i) => segments[i + 1]?.leadIn ?? 0),
    }),
    [segments],
  )

  // A segment is the last of its exercise instance when the next segment is a
  // different move (or there is no next segment). Only the last segment's
  // natural completion marks the instance done (Q21c).
  const isLastOfInstance = useCallback(
    (i: number) =>
      i === segments.length - 1 || segments[i + 1].exerciseId !== segments[i].exerciseId,
    [segments],
  )

  // Q21c: mark a logged instance done (natural completion) or skipped (Skip).
  // A prior Skip wins — "mark true unless already false".
  const markInstance = useCallback(
    (stepIndex: number, done: boolean) => {
      const seg = segments[stepIndex]
      if (seg === undefined || !loggedIds.includes(seg.exerciseId)) return
      setDoneMap((m) => {
        const current = m.get(seg.exerciseId)
        if (done) {
          if (current === false || current === true) return m // skip wins / already done
          const next = new Map(m)
          next.set(seg.exerciseId, true)
          return next
        }
        if (current === false) return m
        const next = new Map(m)
        next.set(seg.exerciseId, false)
        return next
      })
    },
    [segments, loggedIds],
  )

  // E26: a rest gets its own lower falling beep, and (when voice cues are on)
  // the next/starting exercise is spoken so eyes can stay off the screen.
  const commitResult = useCallback(
    (result: { state: PlaybackState | null; event: string | null }) => {
      if (result.event !== null) {
        beep(result.event === 'rest-started' ? 'rest' : 'work')
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
        if (settings.player.voiceCues) {
          if (result.event === 'rest-started' && result.state !== null) {
            const next = segments[result.state.stepIndex + 1]
            // Match the on-screen "Get ready — up next: X" heading (Q13b rest gap).
            if (next !== undefined) speak(`Get ready. Up next: ${next.name}`)
          } else if (result.event === 'step-advanced' && result.state !== null) {
            const seg = segments[result.state.stepIndex]
            if (seg !== undefined) speak(seg.name)
          } else if (result.event === 'sequence-finished') {
            speak('Workout complete')
          }
        }
      }
      if (result.event === 'sequence-finished') setFinished(true)
      setPlayback(result.state)
    },
    [segments, settings.player.voiceCues],
  )

  // 200 ms tick interval mirrors FocusPage; the engine is wall-clock driven so
  // tab-hidden/screen-off stays accurate via `endsAt`.
  useEffect(() => {
    if (playback === null || playback.pausedMs !== null || segments.length === 0) return
    const id = setInterval(() => {
      const now = Date.now()
      setNowTick(now)
      const result = tickPlayback(playback, opts, now)
      if (result.state !== playback || result.event !== null) {
        if (
          playback.phase === 'work' &&
          result.event !== null &&
          isLastOfInstance(playback.stepIndex)
        ) {
          markInstance(playback.stepIndex, true)
        }
        commitResult(result)
      }
    }, 200)
    return () => clearInterval(id)
  }, [playback, opts, segments.length, isLastOfInstance, markInstance, commitResult])

  useWakeLock(playback !== null)

  // Persist the per-jump done/skipped log when the summary appears and on every
  // checklist correction (Q21c). Raw user input — allowed under "never store derived".
  useEffect(() => {
    if (!finished || loggedIds.length === 0) return
    const record: Record<string, boolean> = {}
    for (const id of loggedIds) record[id] = doneMap.get(id) === true
    setExerciseDone(key, programDayId, record)
  }, [finished, doneMap, loggedIds, key, programDayId])

  // Auto-mark completion at sequence-finished when the setting is on (Q17).
  useEffect(() => {
    if (finished && settings.player.autoMarkDone && session?.status !== 'yes') {
      setCompletionStatus(key, programDayId, 'yes')
    }
  }, [finished, settings.player.autoMarkDone, session?.status, key, programDayId])

  // Occurrences for this key, incl. rest-day X Stretch guided-play entries.
  // Computed before the early returns below so the hook runs unconditionally
  // (rules-of-hooks); guards the null schedule internally.
  const occurrences = useMemo(() => {
    if (schedule === null) return []
    const standard = workoutOccurrences(schedule, key)
    if (key !== 'x-stretch') return standard
    const out = [...standard]
    for (const d of schedule.days) {
      if (d.kind === 'program' && d.workouts.every((wk) => getWorkout(wk).style === 'rest')) {
        if (!out.some((exist) => exist.programDayId === d.programDayId)) {
          out.push(d)
        }
      }
    }
    return out.sort((a, b) => a.day - b.day)
  }, [schedule, key])

  if (!valid || timeline === null) return <Navigate to={`/workouts/${key}`} replace />
  if (schedule === null) return <Navigate to={`/workouts/${key}`} replace />

  const occIndex = occurrences.findIndex((d) => d.programDayId === programDayId)
  if (occIndex < 0) return <Navigate to={`/workouts/${key}`} replace />
  const day = occurrences[occIndex]
  const def = getWorkout(key)

  const onPlay = () => {
    setFinished(false)
    setDoneMap(new Map())
    const now = Date.now()
    setNowTick(now)
    // E26: announce the opening exercise at workout start.
    if (settings.player.voiceCues) speak(segments[idx].name)
    // E17: pass null straight through for untimed rep drills → engine wait.
    setPlayback(startPlayback(idx, segments[idx].seconds, now))
  }
  const onPause = () => setPlayback((p) => (p === null ? p : pausePlayback(p, Date.now())))
  const onResume = () => setPlayback((p) => (p === null ? p : resumePlayback(p, Date.now())))
  const onExtend = () => setPlayback((p) => (p === null ? p : extendPlayback(p, 10_000)))
  const onSkip = () => {
    if (playback === null) return
    // Skipping a WORK phase = didn't do that exercise → mark its instance skipped.
    if (playback.phase === 'work') markInstance(playback.stepIndex, false)
    commitResult(skipPhase(playback, opts, Date.now()))
  }
  // E17: Done — next on an untimed wait records the drill done (true), then
  // advances via the same skipPhase path Skip uses (which records false). One
  // engine call; the handler records intent before advancing.
  const onDone = () => {
    if (playback === null) return
    if (playback.phase === 'work') markInstance(playback.stepIndex, true)
    commitResult(skipPhase(playback, opts, Date.now()))
  }
  const onStop = () => {
    setPlayback(null)
    setFinished(false)
  }

  const toggleAutoMark = () => updatePlayerSettings({ autoMarkDone: !settings.player.autoMarkDone })
  const toggleVoiceCues = () => updatePlayerSettings({ voiceCues: !settings.player.voiceCues })

  const toggleJump = (id: string) =>
    setDoneMap((m) => {
      const next = new Map(m)
      next.set(id, !(m.get(id) === true))
      return next
    })

  const markYes = () => setCompletionStatus(key, programDayId, 'yes')

  // ── Summary (sequence-finished) ───────────────────────────────────────────
  if (finished) {
    const doneCount = loggedIds.filter((id) => doneMap.get(id) === true).length
    const autoMarked = settings.player.autoMarkDone
    const alreadyYes = session?.status === 'yes'
    return (
      <Page title={def.name} subtitle={`Week ${day.week} · ${formatLong(day.date)}`}>
        <Card>
          <h2 className="text-lg font-semibold">Workout complete 🎉</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Jumps done{' '}
            <strong className="tabular-nums">
              {doneCount} of {loggedIds.length}
            </strong>{' '}
            · {segments.length} segments played.
          </p>

          {/* Q21c: editable per-jump checklist — corrections persist via the effect above */}
          <ul className="mt-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {loggedIds.map((id) => (
              <li key={id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={doneMap.get(id) === true}
                    onChange={() => toggleJump(id)}
                    className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
                  />
                  <span>{id.split('-').slice(0, 4).join(' ')}</span>
                </label>
              </li>
            ))}
          </ul>

          {autoMarked ? (
            <p className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Marked done automatically — setting
            </p>
          ) : alreadyYes ? (
            <p className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Marked done ✓
            </p>
          ) : (
            <button
              type="button"
              onClick={markYes}
              className="mt-4 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Mark completed — YES
            </button>
          )}

          <input
            type="text"
            aria-label={`Notes for ${formatLong(day.date)}`}
            value={session?.notes ?? ''}
            onChange={(e) => setSessionNotes(key, programDayId, e.target.value)}
            placeholder="Notes"
            className="mt-4 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="mt-4">
            <Link
              to="/today"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Back to Today
            </Link>
          </div>
        </Card>
      </Page>
    )
  }

  // ── Running / idle ────────────────────────────────────────────────────────
  const isRest = playback !== null && playback.phase === 'rest'
  // E17: an untimed work segment waits with endsAt null and pausedMs null —
  // the tick guard holds it forever until Done/Skip advances it.
  const isWait = playback !== null && playback.endsAt === null && playback.pausedMs === null
  const cursorIndex =
    playback === null
      ? idx
      : playback.phase === 'work'
        ? playback.stepIndex
        : playback.stepIndex + 1
  const current = segments[Math.min(cursorIndex, segments.length - 1)]
  const isBreak = current?.kind === 'break'
  const countdownSec =
    playback === null ? (current?.seconds ?? 0) : Math.ceil(remainingMs(playback, nowTick) / 1000)
  const nextSeg = isRest ? segments[playback!.stepIndex + 1] : null

  return (
    <Page
      title={def.name}
      subtitle={`Play mode · Week ${day.week} · ${formatLong(day.date)}`}
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
            {current?.section} · Segment {Math.min(cursorIndex, segments.length - 1) + 1} of{' '}
            {segments.length}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-red-600 transition-all"
            style={{
              width: `${((Math.min(cursorIndex, segments.length - 1) + 1) / segments.length) * 100}%`,
            }}
          />
        </div>

        {isRest ? (
          <>
            <h2 className="mt-4 text-xl font-semibold">Get ready — up next: {nextSeg?.name}</h2>
            {nextSeg?.cue ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{nextSeg.cue}</p>
            ) : null}
          </>
        ) : (
          <>
            <h2 className="mt-4 text-xl font-semibold">{current?.name}</h2>
            {current?.cue ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{current.cue}</p>
            ) : null}
          </>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {playback !== null ? (
            <>
              <span
                className={`rounded-md px-2 py-1 text-xs font-semibold tracking-wide uppercase ${
                  isRest
                    ? 'bg-zinc-600 text-white'
                    : isBreak
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 text-white'
                }`}
              >
                {isRest ? 'Get ready' : isBreak ? 'Break' : 'Work'}
              </span>
              {isWait ? (
                // E17: untimed rep drill — show the rep target instead of a countdown.
                <span className="text-2xl font-bold tabular-nums" aria-label="Rep target">
                  {current?.reps ? `${current.reps} reps` : 'Ready'}
                </span>
              ) : (
                <span
                  role="timer"
                  aria-label="Segment time remaining"
                  className="text-2xl font-bold tabular-nums"
                >
                  {mmss(countdownSec)}
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                {isWait ? null : playback.pausedMs === null ? (
                  <button type="button" onClick={onPause} className={ghostBtn}>
                    Pause
                  </button>
                ) : (
                  <button type="button" onClick={onResume} className={ghostBtn}>
                    Resume
                  </button>
                )}
                {isWait ? (
                  // E17: Done records this drill done, then advances (Skip records not-done).
                  <button
                    type="button"
                    onClick={onDone}
                    className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Done — next
                  </button>
                ) : (
                  <button type="button" onClick={onExtend} className={ghostBtn}>
                    +10 s
                  </button>
                )}
                <button type="button" onClick={onSkip} className={ghostBtn}>
                  Skip
                </button>
                <button type="button" onClick={onStop} className={ghostBtn}>
                  Stop
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-2xl font-bold tabular-nums">{mmss(countdownSec)}</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={ghostBtn}
                  disabled={idx === 0}
                  onClick={() => setIdx(idx - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
                  onClick={onPlay}
                >
                  Start
                </button>
                {idx < segments.length - 1 ? (
                  <button
                    type="button"
                    className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    onClick={() => setIdx(idx + 1)}
                  >
                    Next
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        {playback === null ? (
          <div className="mt-3 flex flex-col gap-2">
            {timelinesFor(key).length > 1 ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold">Timeline:</span>
                <div
                  role="group"
                  aria-label="Yoga timeline picker"
                  className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700"
                >
                  {timelinesFor(key).map((t) => (
                    <button
                      key={t.variant}
                      type="button"
                      aria-pressed={chosenVariant === t.variant}
                      onClick={() => setChosenVariant(t.variant)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        chosenVariant === t.variant
                          ? 'bg-red-600 text-white'
                          : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {t.variant === 'classic' ? 'Classic (90 min)' : 'P90X3 (30 min)'}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {/* E27: launch the session video/audio deeplink without leaving play mode */}
            {links !== undefined ? (
              <div className="flex flex-wrap items-center gap-2">
                <MediaLinks workoutKey={key} workoutName={def.name} />
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <button
                type="button"
                onClick={toggleAutoMark}
                aria-pressed={settings.player.autoMarkDone}
                className={`rounded-lg border px-2.5 py-1.5 font-medium ${
                  settings.player.autoMarkDone
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                Auto-mark done
              </button>
              {/* E26: spoken announcements of the next exercise at rest/work switches */}
              <button
                type="button"
                onClick={toggleVoiceCues}
                aria-pressed={settings.player.voiceCues}
                className={`rounded-lg border px-2.5 py-1.5 font-medium ${
                  settings.player.voiceCues
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                Voice cues
              </button>
              <span>
                · Auto-mark sets YES at the end; voice cues speak the next exercise aloud.
              </span>
            </div>
          </div>
        ) : null}
      </Card>
    </Page>
  )
}

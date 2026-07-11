# Epic E12 — Focus mode play timer (auto-advancing work/rest sequence)

> **Status:** SPEC — awaiting build greenlight · **Stories:** US-100 → US-103 · **Branch:** `claude/epic-e12-focus-play-timer`
> **Ships as:** app version **1.4.0** · **Schema:** **v1 → v2** (adds `settings.timer`; introduces the stepwise migration pipeline)
> **Depends on:** E13 merged (version 1.2.0+, CHANGELOG exists) **and E11 merged** (focus mode is step-based; the e2e below asserts `Step 1 of 24`)
> **One-liner:** press Play in focus mode and the workout runs itself — work slot per step (default 60 s), cue, rest at your configured duration (inputs stay on the step you just did), auto-advance to the next step, through the whole sequence; pause/resume, +10 s, skip; durations persist.

Execution blueprint — follow literally. Full file contents and exact before/after edits below. If quoted "current code" doesn't match disk, or a precondition fails, **STOP and report**.

---

## 0. Executor contract

Repo root `p90x-webapp/`; all commands run there.

**Preconditions — STOP on any mismatch:**

1. `git status` clean, on `main`, after `git pull`.
2. `node -e "console.log(require('./package.json').version)"` → `1.3.0` (E11+E13 merged).
3. `src/lib/schema.ts` line 8: `export const SCHEMA_VERSION = 1`.
4. `src/lib/focusSteps.ts` exists (E11) and `e2e/logging.spec.ts` contains `Step 1 of 24 · Round 1`.
5. `npm ci` if needed; `npm run test` green; `npm run build && npm run e2e` green before any change.

**Repo rules (self-contained restatement):** Conventional Commits, one commit per story, trailer per `CLAUDE.md`. Validate before every commit: `npm run format` then `npm run lint && npm run typecheck && npm run test && npm run build`; journeys change here ⇒ `npm run e2e` (build first, chromium + mobile), UI changes ⇒ `npm run lhci` once pre-PR. Explicit `git add` lists. TS strict, `import type` for types, no enums. Vitest globals OFF; pure-logic tests need no jsdom pragma. E2E pitfalls: name matching is substring (use `exact: true` where noted below — several new buttons collide by substring); persistence debounced 300 ms (`page.clock.fastForward(500)` before `page.reload()`); hash-nav keeps the in-memory store. Open the PR; **never merge**.

**DO NOT TOUCH:** `src/lib/scoring.ts`, `src/lib/focusSteps.ts` (E11's order is final), `StrengthGrid.tsx`, `worker/**`, `docs/PRD.md`.

---

## 1. Locked decisions (Pablo, 2026-07-11)

- **Q3:** work slot **60 s default, adjustable in-session**, same mechanism everywhere focus mode exists — **including Ab Ripper X**.
- **Q4:** when a work slot ends, **stay on the just-done step during rest** (type your reps then), show "up next", advance when rest ends.
- **Q5:** chosen work/rest durations **persist** → real settings ⇒ **schema bump + migration** per CLAUDE.md.
- Reaching the end never auto-marks the workout complete — **Finish stays a deliberate tap** (locked in the E12 grill).
- Rest duration = the existing rest-timer duration, now persisted; one source of truth (`settings.timer.restSeconds`), adjustable on the embedded rest-timer card.

## 2. Current state — verified anchors

- `src/lib/schema.ts:8` `SCHEMA_VERSION = 1`; `settingsSchema` (`:25-39`) has no `timer`; `emptyState()` (`:124-146`) likewise.
- `src/lib/migrations.ts` — v1-only: `version < SCHEMA_VERSION` returns "Unsupported"; **no step pipeline exists yet** (this epic introduces it).
- `migrateToCurrent` is the single funnel for boot (`state/persist.ts:31,:80`), file import (`lib/importExport.ts:50`), and cloud pull (`state/sync.ts:220`) — migrating there covers all entry paths at once.
- `src/features/workouts/TimerCard.tsx` — module-private `beep()` (`:6-26`) and `mmss()` (`:28-32`); `duration` is component-local `useState(60)` (`:40`); `pick(seconds)` (`:88-93`) is the single mutation point for choosing a duration (presets AND the custom input both call it); wake-lock effect at `:62-74`.
- `src/features/workouts/FocusPage.tsx` (post-E11) — step-based `idx` over `focusSteps(def)`; manual Previous/Next; `<TimerCard />` embedded at the bottom.
- Fixture that hardcodes the schema version: `src/state/sync.test.ts:366` `expect(useStore.getState().data.schemaVersion).toBe(1)` — **must become `SCHEMA_VERSION`**.
- `public/sample-data.json` is `schemaVersion: 1` and **stays that way** — after this epic every e2e `importSample` exercises the v1→v2 migration for free.
- `e2e/logging.spec.ts:112-118` — rest-timer e2e (`'60 s'` preset → Start → fastForward 61 000 → "Time's up"). Defaults keep this green unchanged.

---

## 3. Story US-100 — persisted timer settings: schema v2 + migration pipeline (M)

### 3.1 `src/lib/schema.ts` — three exact edits

1. Line 8: `export const SCHEMA_VERSION = 1` → `export const SCHEMA_VERSION = 2`.
2. In `settingsSchema`, after the line `scoring: scoringSettingsSchema,` insert:

```ts
  /** E12: focus-playback + rest-timer durations, whole seconds */
  timer: z.object({
    workSeconds: z.number().int().min(5).max(3600),
    restSeconds: z.number().int().min(5).max(3600),
  }),
```

3. In `emptyState()`, after the `scoring: { … }` line insert:

```ts
      timer: { workSeconds: 60, restSeconds: 60 },
```

### 3.2 `src/lib/migrations.ts` — FULL replacement content

```ts
import { appStateSchema, SCHEMA_VERSION, type AppState } from '@/lib/schema'

export type MigrationResult =
  { ok: true; state: AppState; migrated: boolean } | { ok: false; error: string }

/**
 * Stepwise vN → vN+1 transforms (PRD US-004/US-012). Each mutates a private
 * clone in place and only adds what its version introduced; full Zod validation
 * runs once at the end, so old exports and old localStorage snapshots keep
 * importing through every entry path (boot, file import, backup, cloud pull).
 */
const MIGRATIONS: Record<number, (doc: Record<string, unknown>) => void> = {
  // v1 → v2 (E12): per-user focus-playback / rest-timer durations.
  1: (doc) => {
    const settings = doc.settings as { timer?: unknown } | undefined
    if (settings !== undefined && settings.timer === undefined) {
      settings.timer = { workSeconds: 60, restSeconds: 60 }
    }
  },
}

export function migrateToCurrent(raw: unknown): MigrationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Not a data document (expected a JSON object).' }
  }
  const version = (raw as { schemaVersion?: unknown }).schemaVersion
  if (typeof version !== 'number') {
    return { ok: false, error: 'Missing schemaVersion — not a p90x-webapp export.' }
  }
  if (version > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `This file is from a newer app version (schema v${version}, app supports v${SCHEMA_VERSION}). Update the app first.`,
    }
  }
  let doc = raw as Record<string, unknown>
  let migrated = false
  if (version < SCHEMA_VERSION) {
    doc = structuredClone(doc)
    for (let v = version; v < SCHEMA_VERSION; v++) {
      const step = MIGRATIONS[v]
      if (step === undefined) {
        return { ok: false, error: `Unsupported schema version v${version}.` }
      }
      step(doc)
      doc.schemaVersion = v + 1
      migrated = true
    }
  }
  const parsed = appStateSchema.safeParse(doc)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first?.path.join('.') || '(root)'
    return { ok: false, error: `Invalid data at ${where}: ${first?.message ?? 'unknown error'}` }
  }
  return { ok: true, state: parsed.data, migrated }
}
```

Behavior preserved by construction: v0 still fails (`MIGRATIONS[0]` undefined → "Unsupported schema version v0."), newer versions keep the exact same message, invalid-shape reporting unchanged — the existing tests in `schema.test.ts:92-112` pass untouched.

### 3.3 New file `src/lib/migrations.test.ts` — EXACT content

```ts
import { describe, expect, it } from 'vitest'
import { migrateToCurrent } from './migrations'
import { emptyState, SCHEMA_VERSION } from './schema'

/** A faithful v1 document: today's empty state minus everything v2 added. */
function v1Doc(): Record<string, unknown> {
  const doc = JSON.parse(JSON.stringify(emptyState())) as {
    schemaVersion: number
    settings: Record<string, unknown>
  }
  doc.schemaVersion = 1
  delete doc.settings.timer
  return doc
}

describe('migration pipeline', () => {
  it('upgrades a v1 document to current, adding timer defaults', () => {
    const result = migrateToCurrent(v1Doc())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.schemaVersion).toBe(SCHEMA_VERSION)
      expect(result.state.settings.timer).toEqual({ workSeconds: 60, restSeconds: 60 })
    }
  })

  it('never mutates the caller’s document', () => {
    const doc = v1Doc()
    migrateToCurrent(doc)
    expect(doc.schemaVersion).toBe(1)
    expect((doc as { settings: Record<string, unknown> }).settings.timer).toBeUndefined()
  })

  it('passes a current document through unmigrated', () => {
    const result = migrateToCurrent(emptyState())
    expect(result).toMatchObject({ ok: true, migrated: false })
  })

  it('still rejects v0 and newer-than-current versions', () => {
    expect(migrateToCurrent({ schemaVersion: 0 }).ok).toBe(false)
    expect(migrateToCurrent({ schemaVersion: SCHEMA_VERSION + 1 }).ok).toBe(false)
  })
})
```

### 3.4 Fixture fix — `src/state/sync.test.ts`

Line 366: `expect(useStore.getState().data.schemaVersion).toBe(1)` → `expect(useStore.getState().data.schemaVersion).toBe(SCHEMA_VERSION)`. Add `SCHEMA_VERSION` to that file's existing value-import from `@/lib/schema` (it already imports `emptyState` — extend that import). No other fixture hardcodes the version (verified: `persist.test.ts:43` uses 999, `importExport.test.ts:58` uses 99 — both stay valid).

### 3.5 New file `src/features/workouts/timerUtils.ts` — beep + mmss extracted verbatim

Create the file with the **exact bodies currently in `TimerCard.tsx:6-32`**, exported:

```ts
/** Shared by the rest timer and focus playback (E12) — extracted from TimerCard. */
export function beep() {
  // …copy TimerCard's beep() body byte-for-byte…
}

export function mmss(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
```

Then in `TimerCard.tsx`: delete the local `beep` and `mmss` definitions and add `import { beep, mmss } from './timerUtils'`.

### 3.6 `src/state/actions.ts` — new action (append after `updateScoring`)

```ts
/**
 * Focus-playback + rest-timer durations (E12). Whole seconds, clamped to
 * 5–3600 — mirrors updateScoring's guard style: live mutation bypasses Zod,
 * so invalid values are corrected rather than stored.
 */
export function updateTimerSettings(patch: Partial<Settings['timer']>): void {
  useStore.getState().mutate((draft) => {
    for (const key of ['workSeconds', 'restSeconds'] as const) {
      const value = patch[key]
      if (value !== undefined && Number.isFinite(value)) {
        draft.settings.timer[key] = Math.min(3600, Math.max(5, Math.round(value)))
      }
    }
  })
}
```

### 3.7 `TimerCard.tsx` — persist the rest duration

- Add imports: `import { updateTimerSettings } from '@/state/actions'` and `import { useSettings } from '@/state/selectors'`.
- Replace `const [duration, setDuration] = useState(60)` with:

```ts
const restDefault = useSettings().timer.restSeconds
const [duration, setDuration] = useState(restDefault)
```

- In `pick(seconds)`, add `updateTimerSettings({ restSeconds: seconds })` as the first line. (Presets and the custom input both funnel through `pick` — one insertion point covers both.)

### 3.8 Validate & commit

Full pipeline + `npm run build && npm run e2e` (sample import now migrates v1→v2 in every spec's beforeEach — the whole suite is a migration test).

```
git add src/lib/schema.ts src/lib/migrations.ts src/lib/migrations.test.ts src/state/sync.test.ts src/features/workouts/timerUtils.ts src/features/workouts/TimerCard.tsx src/state/actions.ts
git commit -m "feat(settings): persisted work/rest timer durations (schema v2)"
```

**AC:** [ ] SCHEMA_VERSION 2; v1 docs (incl. `sample-data.json`) import with `migrated: true` and timer defaults · [ ] caller's object never mutated · [ ] v0/newer still refused with the original messages · [ ] rest-timer preset choice survives a reload · [ ] existing rest-timer e2e untouched and green · [ ] no secret/new key in localStorage beyond the existing versioned doc.

---

## 4. Story US-101 — pure playback engine (S)

### 4.1 New file `src/lib/playback.ts` — EXACT content

```ts
/**
 * Pure focus-playback engine (E12): work → rest (same step) → work (next step)
 * … → finished after the last step's work (no trailing rest). Every function
 * takes `now` (epoch ms) — no Date.now() inside, so tests are exact and the UI
 * drives it from an interval. Invariant: `endsAt === null` ⇔ paused, with the
 * remaining time parked in `pausedMs`.
 */
export type PlaybackPhase = 'work' | 'rest'

export interface PlaybackState {
  phase: PlaybackPhase
  stepIndex: number
  endsAt: number | null
  pausedMs: number | null
}

export interface PlaybackOpts {
  stepCount: number
  workSeconds: number
  restSeconds: number
}

export type PlaybackEvent = 'rest-started' | 'step-advanced' | 'sequence-finished'

export interface TickResult {
  /** null when the sequence finished */
  state: PlaybackState | null
  event: PlaybackEvent | null
}

export function startPlayback(stepIndex: number, workSeconds: number, now: number): PlaybackState {
  return { phase: 'work', stepIndex, endsAt: now + workSeconds * 1000, pausedMs: null }
}

export function pausePlayback(state: PlaybackState, now: number): PlaybackState {
  if (state.endsAt === null) return state
  return { ...state, endsAt: null, pausedMs: Math.max(0, state.endsAt - now) }
}

export function resumePlayback(state: PlaybackState, now: number): PlaybackState {
  if (state.pausedMs === null) return state
  return { ...state, endsAt: now + state.pausedMs, pausedMs: null }
}

/** +N ms onto whichever phase is counting — running or paused. */
export function extendPlayback(state: PlaybackState, ms: number): PlaybackState {
  if (state.pausedMs !== null) return { ...state, pausedMs: state.pausedMs + ms }
  if (state.endsAt !== null) return { ...state, endsAt: state.endsAt + ms }
  return state
}

export function remainingMs(state: PlaybackState, now: number): number {
  if (state.pausedMs !== null) return state.pausedMs
  return state.endsAt === null ? 0 : Math.max(0, state.endsAt - now)
}

/** Returns the SAME state reference when nothing changed (cheap no-op detect). */
export function tickPlayback(state: PlaybackState, opts: PlaybackOpts, now: number): TickResult {
  if (state.pausedMs !== null || state.endsAt === null || now < state.endsAt) {
    return { state, event: null }
  }
  if (state.phase === 'work') {
    if (state.stepIndex >= opts.stepCount - 1) {
      return { state: null, event: 'sequence-finished' }
    }
    return {
      state: {
        phase: 'rest',
        stepIndex: state.stepIndex,
        endsAt: now + opts.restSeconds * 1000,
        pausedMs: null,
      },
      event: 'rest-started',
    }
  }
  return {
    state: {
      phase: 'work',
      stepIndex: state.stepIndex + 1,
      endsAt: now + opts.workSeconds * 1000,
      pausedMs: null,
    },
    event: 'step-advanced',
  }
}

/** Force-complete the current phase (works while paused too). */
export function skipPhase(state: PlaybackState, opts: PlaybackOpts, now: number): TickResult {
  const running = state.pausedMs === null ? state : resumePlayback(state, now)
  return tickPlayback({ ...running, endsAt: now }, opts, now)
}
```

### 4.2 New file `src/lib/playback.test.ts` — EXACT content

```ts
import { describe, expect, it } from 'vitest'
import {
  extendPlayback,
  pausePlayback,
  remainingMs,
  resumePlayback,
  skipPhase,
  startPlayback,
  tickPlayback,
} from './playback'

const OPTS = { stepCount: 3, workSeconds: 60, restSeconds: 30 }
const T0 = 1_000_000

describe('playback engine', () => {
  it('starts in a work phase ending workSeconds later', () => {
    expect(startPlayback(0, 60, T0)).toEqual({
      phase: 'work',
      stepIndex: 0,
      endsAt: T0 + 60_000,
      pausedMs: null,
    })
  })

  it('returns the same reference mid-phase', () => {
    const s = startPlayback(0, 60, T0)
    const r = tickPlayback(s, OPTS, T0 + 59_999)
    expect(r.state).toBe(s)
    expect(r.event).toBeNull()
  })

  it('work end → rest on the SAME step', () => {
    const r = tickPlayback(startPlayback(0, 60, T0), OPTS, T0 + 60_000)
    expect(r.event).toBe('rest-started')
    expect(r.state).toEqual({
      phase: 'rest',
      stepIndex: 0,
      endsAt: T0 + 90_000,
      pausedMs: null,
    })
  })

  it('rest end → work on the NEXT step', () => {
    const rest = { phase: 'rest' as const, stepIndex: 0, endsAt: T0, pausedMs: null }
    const r = tickPlayback(rest, OPTS, T0)
    expect(r.event).toBe('step-advanced')
    expect(r.state).toEqual({
      phase: 'work',
      stepIndex: 1,
      endsAt: T0 + 60_000,
      pausedMs: null,
    })
  })

  it('work end on the last step finishes — no trailing rest', () => {
    const last = { phase: 'work' as const, stepIndex: 2, endsAt: T0, pausedMs: null }
    expect(tickPlayback(last, OPTS, T0)).toEqual({ state: null, event: 'sequence-finished' })
  })

  it('pause freezes remaining time; ticks no-op; resume restores', () => {
    const s = startPlayback(0, 60, T0)
    const paused = pausePlayback(s, T0 + 10_000)
    expect(paused.pausedMs).toBe(50_000)
    expect(paused.endsAt).toBeNull()
    expect(tickPlayback(paused, OPTS, T0 + 999_999).state).toBe(paused)
    const resumed = resumePlayback(paused, T0 + 100_000)
    expect(resumed.endsAt).toBe(T0 + 150_000)
    expect(remainingMs(resumed, T0 + 100_000)).toBe(50_000)
  })

  it('pause/resume are idempotent no-ops when already in that mode', () => {
    const s = startPlayback(0, 60, T0)
    expect(resumePlayback(s, T0)).toBe(s)
    const paused = pausePlayback(s, T0 + 10_000)
    expect(pausePlayback(paused, T0 + 20_000)).toBe(paused)
  })

  it('+10 s extends a running phase and a paused one', () => {
    const s = startPlayback(0, 60, T0)
    expect(extendPlayback(s, 10_000).endsAt).toBe(T0 + 70_000)
    const paused = pausePlayback(s, T0 + 10_000)
    expect(extendPlayback(paused, 10_000).pausedMs).toBe(60_000)
  })

  it('skip force-completes the phase, running or paused', () => {
    const s = startPlayback(0, 60, T0)
    const r = skipPhase(s, OPTS, T0 + 5_000)
    expect(r.event).toBe('rest-started')
    expect(r.state?.endsAt).toBe(T0 + 35_000)
    const paused = pausePlayback(s, T0 + 5_000)
    const r2 = skipPhase(paused, OPTS, T0 + 8_000)
    expect(r2.event).toBe('rest-started')
    expect(r2.state?.endsAt).toBe(T0 + 38_000)
  })

  it('remainingMs clamps at zero', () => {
    expect(remainingMs(startPlayback(0, 60, T0), T0 + 61_000)).toBe(0)
  })
})
```

### 4.3 Commit

```
git add src/lib/playback.ts src/lib/playback.test.ts
git commit -m "feat(lib): pure playback engine for focus play sequences"
```

**AC:** [ ] all 10 tests green with exact timestamps · [ ] no `Date.now()` anywhere in `playback.ts` · [ ] covered by `src/lib/**` coverage automatically.

---

## 5. Story US-102 — Play UI in FocusPage + e2e (M)

### 5.1 `src/features/workouts/FocusPage.tsx` — exact edits

**Imports to add:**

```ts
import { useEffect, useState } from 'react' // replaces the existing `import { useState } from 'react'`
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
import { updateTimerSettings } from '@/state/actions' // merge into the existing '@/state/actions' import
import { useSettings } from '@/state/selectors' // merge into the existing '@/state/selectors' import
import { beep, mmss } from './timerUtils'
```

**State (directly after the existing `const [finished, setFinished] = useState(false)`):**

```ts
const settings = useSettings()
const [playback, setPlayback] = useState<PlaybackState | null>(null)
const [playDone, setPlayDone] = useState(false)
const [nowTick, setNowTick] = useState(() => Date.now())
```

**Effects + handlers (insert after the `finish` function; `steps` exists from E11):**

```ts
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
```

(If the `react-hooks/exhaustive-deps` disable comments are rejected by oxlint config, drop the comments — the deps arrays as written are complete enough to lint clean; keep the arrays exactly as given.)

**Controls block.** Replace the existing nav block

```tsx
        <div className="mt-5 flex flex-wrap gap-2">
          <button … >Previous</button>
          {idx < steps.length - 1 ? ( <button …>Next</button> ) : ( <button …>Finish workout</button> )}
        </div>
```

with (Previous/Next/Finish buttons stay byte-identical inside):

```tsx
{
  playback === null ? (
    <>
      {playDone ? (
        <p className="mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          Sequence complete — review your entries, then finish below.
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        [existing Previous button UNCHANGED] [existing Next / Finish workout conditional UNCHANGED]
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
          · Rest between steps: {settings.timer.restSeconds} s — set it on the rest timer below.
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
  )
}
```

Behavior notes locked in: during **rest the card does not advance** — `idx` changes only on the `step-advanced` event, so the athlete types reps into the step just performed while "up next" names the coming one (Q4). Manual Previous/Next are hidden while playing (Pause → Stop returns them). The final work slot fires `sequence-finished`: playback ends, the green line appears, and the athlete presses the existing **Finish workout** button — completion is never automatic.

### 5.2 New file `e2e/focus-play.spec.ts` — EXACT content

```ts
import { expect, test, type Page } from '@playwright/test'

/**
 * Focus play mode (E12) on the sample dataset @ 2026-01-20 (day 15, Chest &
 * Back — 24 steps after E11). Playwright's clock drives both Date.now() and the
 * 200 ms tick interval, so phases are advanced deterministically.
 */

async function importSample(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-20T09:00:00') })
  await importSample(page)
  await page.goto('#/today')
  await page.getByRole('link', { name: 'Log in focus mode' }).first().click()
  await expect(page.getByText('Step 1 of 24 · Round 1')).toBeVisible()
})

test('play auto-advances work → rest → next step, with pause, extend, skip, stop', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  const countdown = page.getByRole('timer', { name: 'Sequence time remaining' })
  await expect(page.getByText('Work', { exact: true })).toBeVisible()
  await expect(countdown).toHaveText('1:00')

  // work ends → rest on the SAME step; inputs stay editable; up-next shown
  await page.clock.fastForward(60_300)
  await expect(page.getByText(/Rest — up next: Wide Front Pull-Ups/)).toBeVisible()
  await expect(page.getByText('Step 1 of 24 · Round 1')).toBeVisible()
  await page.getByRole('textbox', { name: 'Standard Push-Ups round 1 reps' }).fill('9')

  // rest ends → advances to step 2, back in a work phase
  await page.clock.fastForward(60_300)
  await expect(page.getByText('Step 2 of 24 · Round 1')).toBeVisible()
  await expect(page.getByText('Work', { exact: true })).toBeVisible()

  // pause freezes the countdown (ticks are ignored while paused)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const frozen = await countdown.textContent()
  await page.clock.fastForward(15_000)
  await expect(countdown).toHaveText(frozen ?? '')
  await page.getByRole('button', { name: 'Resume', exact: true }).click()

  // +10 s and skip both act on the running phase
  await page.getByRole('button', { name: '+10 s', exact: true }).click()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.getByText(/Rest — up next: Military Push-Ups/)).toBeVisible()

  // stop returns the manual controls
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible()
})

test('work and rest duration choices persist across a reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Work 45 s', exact: true }).click()
  // the embedded rest timer's preset is the rest-between-steps duration
  await page.getByRole('button', { name: '90 s', exact: true }).click()
  await page.clock.fastForward(500) // flush the debounced persist
  await page.reload()
  await expect(page.getByRole('button', { name: 'Work 45 s', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: '90 s', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})
```

Selector safety, pre-verified: `'Play'`/`'Pause'` need `exact: true` because the idle TimerCard below also renders Start/Pause at times (its Pause only exists while ITS timer runs — never in these tests — but exact costs nothing); `'90 s'` must be `exact: true` or it would also match `Work 90 s`; the playback countdown's accessible name `Sequence time remaining` does not collide with TimerCard's `Time remaining` (matching is substring of the _candidate's_ name, and `'Time remaining'` is not queried here).

### 5.3 Validate & commit

Full pipeline + build + e2e (chromium + mobile) + `npm run lhci`.

```
git add src/features/workouts/FocusPage.tsx e2e/focus-play.spec.ts
git commit -m "feat(workouts): focus play mode — auto-advancing work/rest with pause, extend, skip"
```

**AC:** [ ] Play runs the E11 step order end-to-end with cues (beep + vibrate) at every transition · [ ] rest keeps the just-done step's inputs on screen with "up next" (Q4) · [ ] pause/resume/+10 s/skip/stop all work; countdown frozen while paused · [ ] wake lock held for the entire session and re-acquired on tab return (manual check on phone — not e2e-testable) · [ ] last step never auto-completes; Finish remains manual · [ ] durations persist (Q5) and ARX focus gets the same controls (Q3) · [ ] both e2e specs green on chromium AND mobile · [ ] Lighthouse ≥ 0.90 ×3.

---

## 6. Story US-103 — docs & release (S)

1. Copy this file to `docs/epics/E12-focus-play-timer.md`.
2. Append to `docs/stories/README.md` (matching the E9/E10/E11 section format): US-100..102 lines + write-up link.
3. `npm version 1.4.0 --no-git-tag-version`
4. Prepend to `CHANGELOG.md` above the 1.3.0 entry:

```markdown
## 1.4.0 — <today's date, YYYY-MM-DD>

- **E12 — Focus play timer** (PR #<N>): press Play and focus mode runs itself —
  work slot per step (default 60 s, adjustable), cue, rest at your configured
  duration with inputs still on the step you just did, auto-advance to the end.
  Pause / resume, +10 s, skip. Durations persist (schema v2 with a stepwise
  migration pipeline; old exports and the v1 sample import cleanly).
```

5. Validate, then:

```
git add docs/epics/E12-focus-play-timer.md docs/stories/README.md package.json package-lock.json CHANGELOG.md
git commit -m "docs(release): E12 epic doc, changelog 1.4.0, bump version"
git push -u origin claude/epic-e12-focus-play-timer
```

PR `E12 — focus play timer (v1.4.0)`, What/Why/How + AC checklists. Watch CI. **STOP — do not merge.**

## 7. Scenario matrix

| Scenario                                         | Expected                                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Play from step 1, let it run                     | work 60 s → cue → rest (same step, editable) → cue → step 2 …                                |
| Last step's work ends                            | `sequence-finished`: cue, playback ends, green "Sequence complete" line, Finish still manual |
| Pause mid-work / mid-rest                        | countdown freezes; ticks no-op; resume continues from the frozen remainder                   |
| +10 s while running / while paused               | end pushed out 10 s / frozen remainder grows 10 s                                            |
| Skip during work                                 | jump straight to that step's rest                                                            |
| Skip during rest                                 | jump straight to next step's work                                                            |
| Play from a mid-sequence step (resume)           | starts at `idx` — works after the E11 resume landed there                                    |
| Change work preset mid-idle                      | next Play uses it; persists across reloads                                                   |
| Rest preset changed on embedded TimerCard        | next rest phase uses it (read live at each rest start)                                       |
| v1 export / sample-data.json / v1 cloud envelope | migrates v1→v2 with timer defaults on import, boot, backup restore, and cloud pull           |
| v3+ document                                     | still refused with "newer app version" message                                               |
| Tab hidden mid-play                              | wall-clock endsAt means no drift; wake lock re-acquired on return                            |
| ARX focus                                        | identical controls, 11 steps                                                                 |

## 8. Out of scope

Auto-completing the session; per-exercise custom durations; audio other than the existing double-beep; background notifications; changing E11's step order; Durable-Object-style precision (wall-clock ms is plenty).

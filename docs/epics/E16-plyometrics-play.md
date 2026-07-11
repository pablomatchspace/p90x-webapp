# Epic E16 — Plyometrics play (authored interval timeline)

> **Status:** SPEC — awaiting build greenlight · **Stories:** US-108 → US-112 · **Branch:** `claude/epic-e16-plyometrics-play`
> **Ships as:** package **1.16.112**, displayed **`1.E16.U112`** (Q20 — see §7) · **Schema:** **v3 → v4** (`settings.player.autoMarkDone`, `session.exerciseDone`) · **Depends on:** main at 1.5.1
> **One-liner:** press "Play workout" on a Plyometrics day and the app runs the whole video timeline — 76 authored segments (flattened L/R & CW/CCW splits, water breaks) with ~5s get-ready gaps, beep at every switch, per-jump done/skipped logging, and an optional auto-mark-done setting. One engine: `playback.ts` generalized (Q15 = A), FocusPage behavior unchanged.

Execution blueprint — follow literally. The requirement doc is the data oracle. If quoted "current code" doesn't match disk, or a precondition fails, **STOP and report — do not improvise.**

**Locked decisions (Pablo, 2026-07-11 — full text in `specs/requirements/plyometrics.md` §Locked decisions):** Q13(b) authored ~5s get-ready gaps between exercises · Q14 flatten every internal split, beep at each switch · Q15(A) generalize `playback.ts`, no engine fork · Q16 route `/workouts/:key/play/:programDayId`, red "Play workout" buttons (Today + detail page), FocusPage stays strength-only, extract shared wake-lock hook · Q17 auto-mark-done as an optional persisted setting, **default OFF** · Q18 no other persisted knobs · Q19 generic mechanism, Plyo-only data (Kenpo/Cardio/Stretch/Yoga = E17–E19) · Q20 version convention `1.E{epic}.U{story}` mapped to semver `1.{epic}.{story}` from E16 onward · Q21(a) water break after block 5 too; (b) listed durations canonical; (c) per-exercise done/skipped persisted in the session (schema bump); (d) Circle Run round-2 authored reversed; (e) Lunges = one 90s segment.

---

## 0. Executor contract

Repo root: `p90x-webapp/`. All commands run there.

**Preconditions — verify ALL before branching; STOP on any mismatch:**

1. `git status` → clean tree, on `main`, up to date after `git pull`.
2. `node -e "console.log(require('./package.json').version)"` → `1.5.1`.
3. `src/lib/schema.ts` line 8: `export const SCHEMA_VERSION = 3`; `src/lib/migrations.ts` has `MIGRATIONS` entries `1:` and `2:`.
4. `src/lib/playback.ts` matches the shapes quoted in §2 (E12 engine).
5. Requirement doc exists at `../specs/requirements/plyometrics.md`; copy verbatim into the repo as `docs/requirements/plyometrics.md` in US-110.
6. `npm ci` if needed; `npm run test` green **before any change**; `npm run build && npm run e2e` green (build first — Playwright serves `dist/`).

**Repo rules (restated so this file stands alone):** Conventional Commits, one commit per story, trailer per `CLAUDE.md`. Validate before every commit: `npm run format` then `npm run lint && npm run typecheck && npm run test && npm run build`; journeys change ⇒ `npm run e2e` (build immediately before), UI changes ⇒ `npm run lhci` once pre-PR. Explicit `git add` lists. TS strict, `import type`, no enums. Vitest globals OFF. E2E pitfalls: substring name-matching (use `exact: true` where noted); frozen `page.clock` needs `fastForward`; persistence debounced 300 ms; hash-nav keeps the in-memory store. Do NOT modify `e2e/smoke.spec.ts` or its baselines (PR #26 owns them). Open the PR; **never merge**.

**DO NOT TOUCH:** `src/lib/scoring.ts`, `src/lib/focusSteps.ts`, `src/data/catalog.json` / `templates.json` (generated), `StrengthGrid.tsx`, `docs/PRD.md`, `worker/**`. `playback.ts` IS touched (Q15A) — but only additively per §3; every existing test must stay green unmodified.

---

## 1. Problem & architecture

Plyometrics is completion-only (US-044). The video is back-to-back 30/60s efforts; the athlete needs the app to BE the cue source (Q13b: 5s repositioning gaps authored in). Design:

- **One engine (Q15A).** `playback.ts` gains optional per-step and per-boundary overrides (`stepSeconds`, `restAfter`, with `0` rest ⇒ skip the rest phase entirely). No overrides ⇒ byte-identical behavior; FocusPage passes none and is untouched except the wake-lock hook extraction (Q16).
- **Authored timeline data** in `src/lib/timelines/` (hand-authored TS, E11 `focusSteps` precedent — video data never enters the generated `src/data/*.json`). Splits flattened per Q14; get-ready gaps expressed as a `leadIn: 5` on the segment they precede, mapped to the engine's `restAfter` (the rest phase renders as "Get ready — up next: …").
- **Per-jump logging (Q21c):** the 23 block/bonus moves are listed in the timeline's `loggedExerciseIds`; playing marks them done (natural completion) or skipped (Skip); a summary checklist allows correction; persisted as `session.exerciseDone` (raw user input — allowed under "never store derived"). Warm-up/cool-down moves are not logged.
- **Completion:** end of sequence → summary; `settings.player.autoMarkDone` (persisted, default false) auto-sets status YES, otherwise the deliberate "Mark completed — YES" tap (E12 lock as default).
- **FocusPage stays strength-only (Q16);** new `PlayPage` at `/workouts/:key/play/:programDayId`.

### Amendment — for Pablo review (E13 versioning policy superseded)

Q20 replaces "minor per feature epic / patch per fix" with `{App}.{Epic}.{Story}`: package.json stays **semver** as `1.{epicNumber}.{storyNumber}` (e.g. `1.16.112`), and the UI/changelog display it as `1.E16.U112`. CLAUDE.md's "Version per epic" bullet is rewritten in US-112. `docs/epics/E13-versioning.md` stays untouched (historical record); the supersession is documented in CHANGELOG + CLAUDE.md.

---

## 2. Current state — verified anchors (2026-07-11)

- `src/lib/playback.ts:17-21` — `PlaybackOpts { stepCount, workSeconds, restSeconds }`; `:58-85` `tickPlayback`: work-end → rest (`opts.restSeconds`) on same step, rest-end → work (`opts.workSeconds`) on next step, last work → `sequence-finished`; `:88-91` `skipPhase`.
- `src/lib/playback.test.ts` — 10 exact-timestamp tests; must stay green UNMODIFIED.
- `src/features/workouts/FocusPage.tsx:93-103` tick-interval effect; `:106-127` wake-lock effect (extraction source); `:165-186` handlers; imports `beep, mmss` from `./timerUtils`.
- `src/features/workouts/timerUtils.ts` — shared `beep()`/`mmss()` (E12).
- `src/lib/schema.ts:8` `SCHEMA_VERSION = 3`; `settingsSchema:25-48` ends with `timer`; `sessionSchema:81-93` has `status` for cardio sheets; `emptyState():133-156`.
- `src/lib/migrations.ts` — stepwise `MIGRATIONS` record with `1:` (timer) and `2:` (ffmi) entries; full-Zod-parse funnel `migrateToCurrent`.
- `src/state/actions.ts:30` `setCompletionStatus`; `:140` `setWorkoutCompleted`; `updateTimerSettings` pattern (clamped mutate) to mirror for the new actions; `setSessionNotes` exists (used by `CompletionLog.tsx:56`).
- `src/features/today/TodayPage.tsx:52-66` completion branch (gets the Play button); `src/features/workouts/CompletionLog.tsx` per-occurrence rows (gets the Play link); `WorkoutDetailPage.tsx:61-62` routes completion styles to `CompletionLog`.
- `src/App.tsx` route table — add the play route beside `workouts/:key/focus/:programDayId`.
- `src/features/more/HelpPage.tsx` renders `__APP_VERSION__` (via `vite.config.ts` define) — display formatter hooks in here (US-112; verify exact line when editing).
- Catalog: `plyometrics` is `style: "completion"`, 0 exercises — timeline attaches by workout key only.

---

## 3. Story US-108 — generalize `playback.ts` (per-step durations, skippable rests) (M)

### 3.1 `src/lib/playback.ts` — exact edits (additive only)

**Edit A — options.** Extend `PlaybackOpts`:

```ts
export interface PlaybackOpts {
  stepCount: number
  workSeconds: number
  restSeconds: number
  /** E16: per-step work-duration overrides (index = stepIndex); missing entry → workSeconds */
  stepSeconds?: number[]
  /** E16: rest after step i; missing entry → restSeconds; 0 ⇒ skip the rest phase entirely */
  restAfter?: number[]
}
```

**Edit B — resolution helpers** (module-private, above `tickPlayback`):

```ts
const workFor = (opts: PlaybackOpts, step: number): number =>
  opts.stepSeconds?.[step] ?? opts.workSeconds

const restFor = (opts: PlaybackOpts, step: number): number =>
  opts.restAfter?.[step] ?? opts.restSeconds
```

**Edit C — `tickPlayback` work-end branch.** Replace the `if (state.phase === 'work') { … }` body after the finished check with:

```ts
const rest = restFor(opts, state.stepIndex)
if (rest <= 0) {
  return {
    state: {
      phase: 'work',
      stepIndex: state.stepIndex + 1,
      endsAt: now + workFor(opts, state.stepIndex + 1) * 1000,
      pausedMs: null,
    },
    event: 'step-advanced',
  }
}
return {
  state: { phase: 'rest', stepIndex: state.stepIndex, endsAt: now + rest * 1000, pausedMs: null },
  event: 'rest-started',
}
```

**Edit D — rest-end branch.** In the final return, `endsAt: now + opts.workSeconds * 1000` → `endsAt: now + workFor(opts, state.stepIndex + 1) * 1000`.

Nothing else changes. `startPlayback` keeps its `(stepIndex, workSeconds, now)` signature — callers resolve the first duration themselves (FocusPage already passes `settings.timer.workSeconds`; PlayPage passes `workFor(opts, idx)`).

### 3.2 Tests — extend `src/lib/playback.test.ts` with a NEW `describe('per-step overrides (E16)')` block (existing tests untouched)

Cover with exact timestamps: `stepSeconds` respected on rest-end advance; `restAfter` per-boundary duration; `restAfter: 0` ⇒ work-end advances straight to next work with `step-advanced` (no rest phase, next work uses its own override); mixed array with holes falls back to uniforms; `skipPhase` across a zero-rest boundary lands on next step's work; uniform-only opts produce results identical to the pre-E16 fixtures (regression pin).

### 3.3 Validate & commit

```
git add src/lib/playback.ts src/lib/playback.test.ts
git commit -m "feat(lib): per-step durations and skippable rests in the playback engine"
```

**AC:** [ ] all pre-existing playback tests green UNMODIFIED · [ ] zero-rest boundaries emit `step-advanced` directly · [ ] overrides index-safe (holes → uniform fallback) · [ ] no behavior change for FocusPage (no overrides passed).

---

## 4. Story US-109 — schema v4: `player.autoMarkDone` + `session.exerciseDone` + actions (M)

### 4.1 `src/lib/schema.ts`

1. Line 8: `SCHEMA_VERSION = 3` → `4`.
2. In `settingsSchema` after the `timer: z.object({ … }),` block:

```ts
  /** E16: play-mode preferences */
  player: z.object({ autoMarkDone: z.boolean() }),
```

3. In `sessionSchema` after the `status` line:

```ts
  /** E16 play mode (Q21c): per-exercise done/skipped log for interval workouts */
  exerciseDone: z.record(z.string(), z.boolean()).optional(),
```

4. `emptyState()` settings: after `timer: { … },` add `player: { autoMarkDone: false },`.

### 4.2 `src/lib/migrations.ts` — append to `MIGRATIONS` after the `2:` entry

```ts
  // v3 → v4 (E16): play-mode preferences (session.exerciseDone is optional — no backfill).
  3: (doc) => {
    const settings = doc.settings as { player?: unknown } | undefined
    if (settings !== undefined && settings.player === undefined) {
      settings.player = { autoMarkDone: false }
    }
  },
```

### 4.3 `src/lib/migrations.test.ts`

Extend the `docAt` helper to `1 | 2 | 3` (v3 = current minus `settings.player`, minus later fields as already handled) and add: v1→v4 full chain lands `player: { autoMarkDone: false }` + prior defaults; v3 doc keeps custom timer/ffmi values and gains `player`; non-mutation, pass-through, v0/newer-rejection tests updated to the new `SCHEMA_VERSION` automatically (they already use the constant).

### 4.4 `src/state/actions.ts` — two new actions (mirror `updateTimerSettings` style)

```ts
/** E16: play-mode preferences (Q17). */
export function updatePlayerSettings(patch: Partial<Settings['player']>): void {
  useStore.getState().mutate((draft) => {
    if (patch.autoMarkDone !== undefined) draft.settings.player.autoMarkDone = patch.autoMarkDone
  })
}

/** E16 (Q21c): merge per-exercise done/skipped flags into a session's play log. */
export function setExerciseDone(
  workoutKey: string,
  programDayId: string,
  patch: Record<string, boolean>,
): void {
  // ensure the session exists (same ensure-session helper the other session mutations use),
  // then: session.exerciseDone = { ...(session.exerciseDone ?? {}), ...patch }
}
```

(Implement `setExerciseDone` with the file's existing ensure-session pattern — read `setCompletionStatus`/`setSessionNotes` first and reuse their session-creation helper verbatim.) Unit-test both through the store like neighboring action tests.

### 4.5 Validate & commit

```
git add src/lib/schema.ts src/lib/migrations.ts src/lib/migrations.test.ts src/state/actions.ts <action test file>
git commit -m "feat(settings): schema v4 — play-mode auto-mark preference and per-exercise play log"
```

**AC:** [ ] SCHEMA_VERSION 4; v1/v2/v3 docs (incl. `sample-data.json` v1) migrate cleanly · [ ] caller's object never mutated · [ ] `exerciseDone` round-trips export→import · [ ] actions clamp/merge correctly and persist.

---

## 5. Story US-110 — timeline types, registry, Plyometrics data + goldens (M)

### 5.1 New file `src/lib/timelines/types.ts`

```ts
/**
 * Authored play timelines (E16): the in-video interval sequence for
 * completion-style workouts, hand-transcribed from docs/requirements/*.md
 * (the oracle). Video/UX data — never part of the generated catalog. Nothing
 * here is persisted; sessions store only status/notes/exerciseDone (US-044 + Q21c).
 */
export interface PlaySegment {
  /** unique within the timeline (kebab-case, split/round-suffixed) */
  id: string
  /** groups split segments and round repeats of the same move (Q21c log key) */
  exerciseId: string
  name: string
  /** null = untimed (manual advance; first used by E17 Kenpo — no null in Plyo) */
  seconds: number | null
  kind: 'exercise' | 'break'
  /** authored get-ready gap BEFORE this segment (Q13b); default 0 */
  leadIn?: number
  /** rep target for untimed segments (E17+) */
  reps?: number
  cue?: string
  section: string
}

export interface PlayTimeline {
  workoutKey: string
  /** variant discriminator (E19 yoga 'classic' | 'x3') */
  variant?: string
  title: string
  source: string
  segments: PlaySegment[]
  /** exerciseIds tracked done/skipped (Q21c); authored explicitly per timeline */
  loggedExerciseIds: string[]
}
```

### 5.2 New file `src/lib/timelines/index.ts` — registry

`TIMELINES: PlayTimeline[]` (starts `[plyometrics]`), `hasTimeline(workoutKey)`, `timelinesFor(workoutKey)`, `getTimeline(workoutKey, variant?)` (fall back to first). Same shape as E11's data modules: pure, no side effects.

### 5.3 New file `src/lib/timelines/plyometrics.ts` — transcription rules (doc = oracle)

Copy `../specs/requirements/plyometrics.md` → `docs/requirements/plyometrics.md` verbatim, then transcribe:

1. Doc order is play order; `section` strings: `'Warm-Up'`, `'Block 1 — Round 1'`, `'Block 1 — Round 2'`, … `'Block 5 — Round 2'`, `'Sports Bonus Round'`, `'Cool Down & Stretch'`.
2. Each block plays Round 1 then Round 2 (same four moves, ids suffixed `-r1`/`-r2`, shared `exerciseId`); a 30s `kind: 'break'` Water Break segment after every block's round 2 — including block 5 (Q21a).
3. **Flatten splits (Q14)** into separate segments sharing `exerciseId`: Tires & MK mini → 15s + 15s; Standing Quad / Hamstring stretches → R 30s + L 30s; Rockstar Hops → 15s L-facing + 15s R-facing; Circle Run → CW 30 + CCW 30 in round 1, **CCW 30 + CW 30 in round 2** (Q21d); Twist Combo → 3-way 30 + 180° 30; Hot Foot → L 30 + R 30; Pitch & Catch → R 30 + L 30; Jump Shot → catch-R/shoot-L 30 + catch-L/shoot-R 30. Lunges stay ONE 90s segment (Q21e). Rep hints ("30 repetitions", "3 squats, jump on 4th") → `cue` only.
4. **Lead-ins (Q13b):** `leadIn: 5` on the FIRST segment of every exercise instance (a new `exerciseId` occurrence within a round/section) except the very first segment of the timeline; water breaks get no `leadIn`; split continuation segments get none (the beep-switch is seamless).
5. `loggedExerciseIds` = the 23 unique block + bonus `exerciseId`s (5 blocks × 4 + 3). Warm-up/cool-down are not logged.

### 5.4 Golden tests — `src/lib/timelines/plyometrics.test.ts`

Pins below were derived from the doc during spec-writing — **recompute while transcribing; on mismatch reconcile against the doc first, only then adjust a pin**:

- Segment count **76**: Warm-Up 11 · Block 1 (R1 4 + R2 4 + water 1) 9 · Blocks 2–5 (5 + 5 + water 1) 11 each · Sports Bonus 5 · Cool Down 7.
- Sum of `seconds` = **2550** (42:30); sum of `leadIn` = **280** (56 gaps × 5 — 57 exercise instances minus the first); full runtime **2830**.
- Breaks: exactly **5**, all 30s, no `leadIn`, none of their ids in `loggedExerciseIds`.
- `loggedExerciseIds.length === 23`, all present among segments' `exerciseId`s, none from Warm-Up/Cool Down.
- Q21d pin: Block 2 R1 ends `…circle-run-cw-r1, circle-run-ccw-r1`; R2 ends `…circle-run-ccw-r2, circle-run-cw-r2`.
- Structural: ids unique; every segment `seconds > 0` (no nulls in Plyo); every non-first exercise-instance head has `leadIn === 5`.

### 5.5 Validate & commit

```
git add docs/requirements/plyometrics.md src/lib/timelines/types.ts src/lib/timelines/index.ts src/lib/timelines/plyometrics.ts src/lib/timelines/plyometrics.test.ts
git commit -m "feat(timelines): Plyometrics authored interval timeline with flattened splits"
```

**AC:** [ ] doc copied verbatim · [ ] every doc item present, order preserved, splits per Q14, R2 circle-run reversed · [ ] 42:30 canonical runtime + 280s authored gaps pinned · [ ] 23 logged jump moves.

---

## 6. Story US-111 — PlayPage, shared wake-lock hook, entry buttons + e2e (L)

### 6.1 Extract `useWakeLock` — new file `src/features/workouts/playerHooks.ts`

Move the wake-lock effect from `FocusPage.tsx:106-127` into `export function useWakeLock(active: boolean): void` (body byte-identical, `playback === null` → `!active`). Refactor FocusPage to `useWakeLock(playback !== null)`; delete the inline effect. No other FocusPage change (Q16: it stays strength-only; `beep`/`mmss` already shared via `timerUtils`).

### 6.2 New route in `src/App.tsx`

```tsx
<Route path="workouts/:key/play/:programDayId" element={<PlayPage />} />
```

(lazy import, same pattern as FocusPage).

### 6.3 New file `src/features/workouts/PlayPage.tsx` — contract

- Guards as FocusPage (invalid key / no schedule / unknown `programDayId` / `getTimeline(key) === null` → `Navigate` away).
- Build once: `segments`, `stepSeconds = segments.map(s => s.seconds ?? 0)` (E16: all timed), `restAfter[i] = segments[i + 1]?.leadIn ?? 0`, `opts = { stepCount, workSeconds: 0, restSeconds: 0, stepSeconds, restAfter }`. Rest phases therefore exist ONLY where authored (`leadIn`) — Q13b/Q14 exactly.
- Header: section badge (current segment's `section`) · `Segment {i + 1} of {segments.length}` · progress bar (FocusPage markup). Card: segment name, `cue`, `role="timer"` countdown (`aria-label="Segment time remaining"`, `mmss`), breaks styled distinctly (emerald), rest phase renders **Get ready — up next: {next.name}**.
- Idle: red **Start** (`startPlayback(idx, stepSeconds[idx], now)`), Previous/Next preview browsing, and the persisted toggle `aria-pressed` button **Auto-mark done** → `updatePlayerSettings({ autoMarkDone: … })` (Q17, default off).
- Running: Pause/Resume, `+10 s`, Skip (`skipPhase`), Stop. Tick effect: copy FocusPage's 200 ms interval pattern with the new opts; `beep()` + `navigator.vibrate([200,100,200])` on every event (`rest-started`, `step-advanced`, `sequence-finished`) — beep at every switch (Q14). `useWakeLock(playback !== null)`.
- **Done/skipped tracking (Q21c):** local `Map<exerciseId, boolean>` — on natural completion of an instance's LAST segment mark `true` unless already `false`; on Skip of any of its segments mark `false`. Only ids in `loggedExerciseIds`.
- Finished: summary card — elapsed wall-clock, jumps done `x of 23`, an editable checklist of the 23 moves (toggling updates the map) — then `setExerciseDone(key, programDayId, mapAsRecord)` on first render of the summary and on every toggle. If `settings.player.autoMarkDone` → also `setCompletionStatus(key, programDayId, 'yes')` automatically (banner "Marked done automatically — setting"); else show **Mark completed — YES** button. Notes input via `setSessionNotes`. Back to Today link.

### 6.4 Entry points (Q16)

1. `TodayPage.tsx` completion branch (`:52-66`): when `hasTimeline(workoutKey)`, red button-styled `Link` **Play workout** → `/workouts/${workoutKey}/play/${day.programDayId}`.
2. `CompletionLog.tsx`: same link per occurrence row (ghost style), when `hasTimeline(def.key)`.

### 6.5 New file `e2e/play.spec.ts`

Sample import (reuse `importSample` pattern from `e2e/focus-play.spec.ts`), UTC-anchored `clock.install`. Find a Plyometrics day in the sample schedule (verify in UI, pin the date with a comment). Tests:

1. Start → `March in Place` `0:30` → `fastForward(30_300)` → next warm-up segment (warm-up boundary: get-ready `0:05` "up next" first, then segment — assert both) → Pause freezes countdown across `fastForward` → Resume → `+10 s` → Skip lands on the following segment.
2. Skip a block jump (e.g. Jump Squats R1) → complete sequence via Skip-loop to the summary → checklist shows that move unchecked, others checked → tap YES → Today shows Done; `exerciseDone` persisted (reload after `fastForward(500)`, revisit summary/export).
3. Auto-mark toggle: enable (persists across reload via `aria-pressed`), and with it on, reaching `sequence-finished` marks status YES without a tap.

### 6.6 Validate & commit

Full pipeline + `npm run build && npm run e2e` + `npm run lhci`.

```
git add src/features/workouts/playerHooks.ts src/features/workouts/FocusPage.tsx src/App.tsx src/features/workouts/PlayPage.tsx src/features/today/TodayPage.tsx src/features/workouts/CompletionLog.tsx e2e/play.spec.ts
git commit -m "feat(workouts): Plyometrics play mode — authored timeline, get-ready gaps, per-jump log"
```

**AC:** [ ] splits beep-switch with NO gap; exercise boundaries get the 5s get-ready (Q13b/Q14) · [ ] water breaks play as segments incl. after block 5 (Q21a) · [ ] per-jump done/skipped captured, correctable, persisted (Q21c) · [ ] auto-mark honors the persisted setting, default off (Q17) · [ ] FocusPage e2e + unit suites untouched and green (Q15A/Q16 regression bar) · [ ] wake lock via the shared hook in both pages · [ ] e2e green chromium AND mobile · [ ] Lighthouse ≥ 0.90 ×3.

---

## 7. Story US-112 — versioning convention + docs & release (S)

1. New file `src/lib/version.ts` + test: `formatAppVersion('1.16.112') === '1.E16.U112'`; minor < 16 → returned unchanged (historical versions keep their display). Wire into `HelpPage` where `__APP_VERSION__` renders.
2. `CLAUDE.md` — replace the "Version per epic" Workflow bullet: from E16 onward package.json is semver `1.{epicNumber}.{lastStoryNumber}` via `npm version … --no-git-tag-version`, displayed as `1.E{epic}.U{story}` on More → Help; CHANGELOG headings use `## 1.E{epic}.U{story} (package 1.{epic}.{story}) — date`. Note the E13-policy supersession explicitly.
3. Copy this spec to `docs/epics/E16-plyometrics-play.md`; append E16 section to `docs/stories/README.md` (US-108..112).
4. `npm version 1.16.112 --no-git-tag-version`.
5. Prepend to `CHANGELOG.md`:

```markdown
## 1.E16.U112 (package 1.16.112) — <today's date, YYYY-MM-DD>

- **E16 — Plyometrics play** (PR #<N>): "Play workout" runs the full Plyo video
  timeline — 76 segments (flattened splits, water breaks), authored 5s get-ready
  gaps, beep at every switch, per-jump done/skipped log (schema v4), optional
  auto-mark-done setting. Playback engine generalized; strength focus play
  unchanged. Versioning convention now 1.E{epic}.U{story} (supersedes E13's
  minor/patch rule).
```

6. Validate, commit (`docs(release): E16 epic doc, versioning convention, 1.E16.U112`), push, open PR `E16 — Plyometrics play (1.E16.U112)` with What/Why/How + §3–§7 AC checklists. Watch CI. **STOP when green — do not merge.**

---

## 8. Scenario matrix

| Scenario                                            | Expected                                                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Warm-up start                                       | 5s get-ready between moves, none before segment 1; splits (Tires/MK, stretches) switch on beep with no gap |
| Block round boundary (ex4 R1 → ex1 R2)              | get-ready 5s then next round; both rounds share `exerciseId` for the log                                   |
| Water break                                         | 30s break segment, no lead-in into it, 5s get-ready after it into the next move                            |
| Circle Run R2                                       | CCW then CW (Q21d), labels authored                                                                        |
| Skip during a jump                                  | segment skipped, exercise marked not-done; correctable on the summary checklist                            |
| Auto-mark ON at finish                              | status YES set automatically + banner; OFF → deliberate tap only                                           |
| v1/v2/v3 imports & sample data                      | migrate to v4 with `player` defaults; `exerciseDone` absent stays absent                                   |
| FocusPage strength play                             | byte-identical behavior (no overrides passed; wake lock via shared hook)                                   |
| Pause / +10s / Skip / Stop                          | E12 semantics on every segment and get-ready phase                                                         |
| Tab hidden / screen off                             | wall-clock `endsAt`, wake-lock re-acquired on return                                                       |
| Deep-link `/play/` for a workout without a timeline | redirect away; no Play buttons rendered                                                                    |
| Help page                                           | shows `1.E16.U112`                                                                                         |

## 9. Out of scope

Kenpo X (E17 — adds untimed rep segments: `seconds: null` engine wait + Done button); X Stretch + Cardio X (E18); Yoga variants + switch (E19); Plyo per-segment history/analytics; adding play screens to the PR #26 visual suite (post-merge chore); transitions option (c) (video-demo-aligned) — rejected via Q13.

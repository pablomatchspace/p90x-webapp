# Epic E17 — Kenpo X play (untimed rep segments + data)

> **Status:** SPEC — awaiting build greenlight · **Stories:** US-113 → US-115 · **Branch:** `claude/epic-e17-kenpo-play`
> **Ships as:** package **1.17.115**, displayed **`1.E17.U115`** · **Schema:** unchanged (SCHEMA_VERSION stays 4) · **Depends on:** E16 merged (package 1.16.112)
> **One-liner:** Kenpo X joins play mode — 93 segments across 11 sections. Rep-based strikes/kicks have no video-fixed duration, so the engine learns untimed segments (`seconds: null` ⇒ wait for a **Done — next** tap); timed stretches and cardio-break intervals count down as in E16. Data-only beyond that (Q19 pattern).

Execution blueprint — follow literally. `specs/requirements/kenpo-x.md` is the data oracle. STOP and report on any precondition or anchor mismatch.

---

## 0. Executor contract

Repo root `p90x-webapp/`. Rules identical to E16 §0 (Conventional Commits + trailer; format→lint→typecheck→test→build before each commit; e2e after build when journeys change; lhci once pre-PR; explicit `git add`; never merge; do not touch `e2e/smoke.spec.ts`, `src/lib/scoring.ts`, `src/lib/focusSteps.ts`, generated `src/data/*`, `docs/PRD.md`, `worker/**`).

**Preconditions:** clean `main` after pull · `package.json` version `1.16.112` · `SCHEMA_VERSION = 4` · `src/lib/timelines/{types,index,plyometrics}.ts` and `src/features/workouts/PlayPage.tsx` exist (E16 shipped) · `../specs/requirements/kenpo-x.md` exists · full suite green pre-change.

---

## 1. Design (delta over E16)

- **Untimed segments.** E16's `PlaySegment.seconds: number | null` already types them; E17 makes the engine and PlayPage honor `null`:
  - Engine: a step whose resolved duration is `null` enters `phase: 'work'` with `endsAt: null, pausedMs: null` — a **wait** state. `tickPlayback`'s existing first guard (`state.endsAt === null` → no-op) already ignores it; `skipPhase` already force-completes it (sets `endsAt: now`, ticks). Only the _entry_ points need the null branch.
  - PlayPage: wait segments render the rep target + cue instead of a countdown, with a prominent **Done — next** button (calls the existing skip handler). Pause/+10s hidden for waits (meaningless); Stop always available.
- **Per-drill logging (Q21c pattern):** `loggedExerciseIds` = every rep-drill `exerciseId` — **46** unique ids (of the 48 numbered doc items, #36/#37 are timed intervals; #38 X Jacks shares `x-jacks` with the three cardio-break appearances). Timed stretches and cardio-break runs are not logged. Same capture/summary-checklist flow as E16, with one nuance: **a wait segment advanced via its Done button counts done; advanced via Skip counts not-done** — two distinct buttons, one engine call, the handler records intent before advancing.

### Decisions for Pablo (defaults apply unless overridden before build)

- **GD-A — logging scope.** Default: all 46 unique rep-drill ids logged (45 numbered drills + `x-jacks`); warm-up/cool-down/cardio-break timed moves not logged. Alternative: numbered drills only (45, excluding X Jacks).

### Amendments to prior epics

None — E16 surfaces absorb Kenpo without change beyond the null-duration branch designed for exactly this epic (E16 §9 forward note).

---

## 2. Verified anchors

Re-verify at build time (E16 will have landed after this spec was written — quote real lines in the PR):

- `src/lib/playback.ts` — E16 shape: `workFor`/`restFor` helpers, `stepSeconds?: number[]`. US-113 widens to `(number | null)[]`.
- `src/lib/playback.test.ts` — pre-E16 fixtures + E16 override block: stay green unmodified.
- `src/features/workouts/PlayPage.tsx` — E16 contract (§6.3 there): `stepSeconds = segments.map(s => s.seconds ?? 0)` **changes** to pass `null` through; countdown card branch gains the wait branch.
- `src/lib/timelines/index.ts` — `TIMELINES` array gains `kenpoX`.

---

## 3. Story US-113 — engine + PlayPage support for untimed segments (M)

### 3.1 `src/lib/playback.ts` — exact edits

1. `stepSeconds?: number[]` → `stepSeconds?: (number | null)[]` (JSDoc: `null` = untimed wait — advance via skip/Done).
2. `workFor` return type `number | null` (body unchanged — `??` keeps uniform fallback for `undefined` holes; an explicit `null` entry passes through).
3. `startPlayback(stepIndex: number, workSeconds: number | null, now: number)` — `endsAt: workSeconds === null ? null : now + workSeconds * 1000`.
4. Everywhere a next-step work phase is entered (E16's Edit C zero-rest branch and Edit D rest-end branch): `const w = workFor(opts, next)` then `endsAt: w === null ? null : now + w * 1000`.

`pausePlayback`/`extendPlayback` already no-op on `endsAt === null`; `remainingMs` already returns 0. `tickPlayback` wait no-op via the existing guard. **No existing test changes.**

### 3.2 Tests — extend `playback.test.ts` (`describe('untimed waits (E17)')`)

Wait entry from start / from zero-rest advance / from rest-end; tick no-ops forever on a wait; `skipPhase` completes a wait (into rest or straight to next work per `restAfter`); pause/extend no-op on a wait; last-step wait → skip → `sequence-finished`.

### 3.3 `src/features/workouts/PlayPage.tsx`

- Pass-through: `stepSeconds = segments.map(s => s.seconds)`; `startPlayback(idx, stepSeconds[idx] ?? null, now)`.
- Running card, `playback.endsAt === null && playback.pausedMs === null` (wait): show `{reps} reps` (or the cue alone for rep-less untimed segments) + **Done — next** (records done=true for the segment's logged exercise, then the skip handler) alongside **Skip** (records done=false). Hide Pause/+10s on waits.
- Timed/wait boundary polish: "Get ready — up next" unchanged (lead-ins still authored data).

Commit: `feat(play): untimed rep segments — engine waits and Done-to-advance UI` (files: `src/lib/playback.ts`, `src/lib/playback.test.ts`, `src/features/workouts/PlayPage.tsx`).

**AC:** [ ] all pre-E17 playback tests green unmodified · [ ] waits never auto-advance; Done and Skip both advance but record opposite log values · [ ] FocusPage untouched.

---

## 4. Story US-114 — Kenpo X timeline data + goldens (M)

### 4.1 Transcription rules (doc = oracle; copy it to `docs/requirements/kenpo-x.md` verbatim)

New file `src/lib/timelines/kenpoX.ts` (`export const kenpoX: PlayTimeline`), registered in `index.ts`.

1. 11 sections named exactly as the doc (`'Warm-Up & Stretch Phase'` … `'Cool Down & Stretch Phase'`); doc order = play order. Section-level preambles (e.g. "Rep-based strikes. Hands up, guard ribs.") are prefixed onto the `cue` of that section's FIRST segment; item-level parentheticals stay on their own segment's `cue`. Deterministic, no schema change.
2. Duration items → timed segments (strip `~`; `60s total` → 60; `15s (slow 10-count)` → 15 with cue). Rep items → untimed: `seconds: null`, `reps` = primary count (first number), split/tempo/yell text verbatim in `cue` (`'20 reps regular + 10 reps double-time with yell'`, `'8 full combinations (24 total kicks)'`, `'30 reps per side (60 total blocks)'`, Star Blocks → reps 4 cue `'2 passes forward, 2 passes back'`, Burnout → reps 100 cue `'100+ reps — starts slow, increases to maximum speed'`).
3. `*Water Break*: 30s` → `kind: 'break'`. Cardio-break moves (running/jump-rope/jacks) are timed exercises; X Jacks are reps (untimed), shared `exerciseId: 'x-jacks'` across all four appearances (ids suffixed `-1..-4`).
4. **Lead-ins:** `leadIn: 5` on every exercise segment except the very first of the timeline; none on the water break. (Every Kenpo item is its own instance — no split continuations.)
5. `loggedExerciseIds` (GD-A): the 45 numbered rep drills + `x-jacks` = **46** unique ids (numbered items #36/#37 are timed and excluded; #38 is `x-jacks`).

### 4.2 Golden tests `src/lib/timelines/kenpoX.test.ts`

Pins (derived at spec time — recompute during transcription; doc wins, then adjust):

- Segments per section `[26, 12, 3, 5, 6, 4, 8, 4, 8, 10, 7]`, total **93**; exactly **1** break (Punch Section 2's water break).
- Timed segments **44** (warm-up 26 · cardio breaks 2+3+3 · water 1 · Blocks & Elbows items 36–37 = 2 · cool-down 7), summed seconds **1535**; untimed (reps) segments **49** (46 numbered drills incl. #38 + 3 cardio-break X Jacks).
- Lead-ins: **91** segments with `leadIn: 5` (93 − first − water break) = **455s**.
- `loggedExerciseIds.length === 46`; all reps segments' `exerciseId`s ∈ logged set; no timed id logged.
- Spot pins: first segment `wide-wrist-pull-stretch` timed 60 leadIn absent; `vertical-punching-burnout` reps 100; ids unique; every timed `seconds > 0`; every untimed has `reps > 0` except none (all Kenpo untimed carry reps).

Commit: `feat(timelines): Kenpo X play timeline — rep drills as untimed segments` (doc copy + data + test + `index.ts`).

**AC:** [ ] every doc item once, in order · [ ] rep nuances verbatim in cues, nothing invented · [ ] 46 logged drills · [ ] Play buttons appear on Kenpo days automatically (registry-driven — verify manually + one e2e smoke assertion added to `e2e/play.spec.ts`: Kenpo day shows `Play workout`, first segment timed, a Punch Section segment shows `Done — next`).

---

## 5. Story US-115 — docs & release (S)

1. Copy spec → `docs/epics/E17-kenpo-play.md`; append E17 section to `docs/stories/README.md`.
2. `npm version 1.17.115 --no-git-tag-version` (display `1.E17.U115` via E16's formatter — no code change).
3. CHANGELOG:

```markdown
## 1.E17.U115 (package 1.17.115) — <date>

- **E17 — Kenpo X play** (PR #<N>): 93-segment Kenpo timeline — timed stretch/
  cardio intervals count down; rep drills wait for a Done tap and log done/
  skipped per drill. Engine gains untimed-wait support; strength play unchanged.
```

4. Validate, commit (`docs(release): E17 epic doc, changelog, 1.E17.U115`), push, PR `E17 — Kenpo X play (1.E17.U115)`. **STOP when green — do not merge.**

---

## 6. Scenario matrix

| Scenario                 | Expected                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Warm-up stretch flow     | timed countdowns + 5s get-ready, as Plyo                                                  |
| Punch Section drill      | wait card: reps target + cue, Done advances (logged done), Skip advances (logged skipped) |
| Drill → drill boundary   | 5s get-ready between waits (authored lead-in)                                             |
| Water break              | 30s break, no lead-in into it                                                             |
| Burnout finish → summary | checklist of 46 drills; auto-mark honors `settings.player.autoMarkDone`                   |
| Pause/+10s on a wait     | controls hidden; Stop still works                                                         |
| Plyo regression          | E16 timeline/e2e untouched and green                                                      |
| Schema                   | no bump; export shape unchanged beyond E16's fields                                       |

## 7. Out of scope

X Stretch/Cardio X (E18), Yoga (E19); pacing estimates for rep drills (rejected — invented data); logging rep counts actually performed (only done/skipped per Q21c).

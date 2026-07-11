# Epic E11 — Chest & Back round sequence in focus mode

> **Status:** SPEC — awaiting build greenlight · **Stories:** US-097 → US-099 · **Branch:** `claude/epic-e11-chest-back-focus-sequence`
> **Ships as:** app version **1.3.0** · **Schema:** unchanged (SCHEMA_VERSION stays 1) · **Depends on:** E13 merged (CHANGELOG.md exists, version 1.2.0)
> **One-liner:** Chest & Back focus mode plays like the video — 24 single-round steps: round 1 in sheet order, then round 2 with every push/pull pair swapped. Grid view, storage and scoring untouched.

This spec is an **execution blueprint**: follow it literally — full file contents and exact before/after edits are given. If any quoted "current code" does not match the file on disk, or any precondition fails, **STOP and report — do not improvise.**

---

## 0. Executor contract

Repo root: `p90x-webapp/`. All commands run there.

**Preconditions — verify ALL before branching; STOP on any mismatch:**

1. `git status` → clean tree, on `main`, up to date after `git pull`.
2. `node -e "console.log(require('./package.json').version)"` → `1.2.0` (E13 merged). If `1.0.0`, E13 hasn't landed — STOP.
3. `CHANGELOG.md` exists at repo root.
4. `src/lib/schema.ts` line 8 reads `export const SCHEMA_VERSION = 1`.
5. `npm ci` if needed, then `npm run test` green **before any change**, and `npm run build && npm run e2e` green (build first — Playwright serves `dist/`).

**Repo rules (restated so this file stands alone):**

- Conventional Commits, one commit per story below, trailer line per `CLAUDE.md`.
- Validate before every commit: `npm run format` then `npm run lint && npm run typecheck && npm run test && npm run build`; this epic changes a journey ⇒ also `npm run e2e` (ALWAYS `npm run build` immediately before it), and UI changed ⇒ `npm run lhci` once before the PR.
- Stage explicit file lists; never `git add -A`.
- TS strict + `verbatimModuleSyntax` (`import type` for type-only imports) + `erasableSyntaxOnly`. Vitest globals OFF — import `describe/it/expect` from `vitest`. Pure-logic tests run in node (no jsdom pragma needed here).
- **E2E pitfalls:** `getByLabel`/`getByRole` name matching is substring by default (`'X round 1 reps'` also hits `'Increase X round 1 reps'` — use `getByRole('textbox', { name })` for inputs); persistence is debounced 300 ms (`page.clock.fastForward(500)` before a reload; hash-nav `page.goto('#/…')` keeps the in-memory store).
- Open the PR; **never merge** — wait for Pablo.
- **DO NOT TOUCH:** `src/data/catalog.json` (generated — the play order is deliberately NOT stored there), `src/lib/scoring.ts`, `src/lib/schema.ts`, `StrengthGrid.tsx` (grid stays Excel-shaped), `docs/PRD.md`.

---

## 1. Problem, goal, locked decisions

Focus mode (`src/features/workouts/FocusPage.tsx`) currently shows **one card per exercise with BOTH rounds' inputs together** — 12 cards for Chest & Back. The video's actual flow is two passes: all 12 exercises (round 1), then the same 12 again (round 2) with each push/pull pair swapped. Logging round 2 next to round 1 fights the real rhythm.

**Locked decisions (Pablo, 2026-07-11):**

- **Q1 — round-2 order confirmed**, all six pairs swap (list in §2).
- **Q2 — Chest & Back only for now**; mechanism must be generic so other workouts (e.g. Shoulders & Arms) can be added later by data only.
- Round-2 step cards show the athlete's round-1 value read-only (it's the penalty-drop comparison).
- Grid view unchanged; storage unchanged (entries stay `exerciseId → rounds[2]`); scoring engine untouched.

## 2. The sequence (exact data)

Catalog order of `chest-back` (verified against `src/data/catalog.json`; all 12 exercises have `rounds: 2`):

| #   | id                              | name                          | secondary |
| --- | ------------------------------- | ----------------------------- | --------- |
| 1   | `standard-push-ups`             | Standard Push-Ups             | knee      |
| 2   | `wide-front-pull-ups`           | Wide Front Pull-Ups           | chair     |
| 3   | `military-push-ups`             | Military Push-Ups             | knee      |
| 4   | `reverse-grip-chin-ups`         | Reverse Grip Chin-Ups         | chair     |
| 5   | `wide-fly-push-ups`             | Wide Fly Push-Ups             | knee      |
| 6   | `closed-grip-overhand-pull-ups` | Closed Grip Overhand Pull-Ups | chair     |
| 7   | `decline-push-ups`              | Decline Push-Ups              | knee      |
| 8   | `heavy-pants`                   | Heavy Pants                   | weight    |
| 9   | `diamond-push-ups`              | Diamond Push-Ups              | knee      |
| 10  | `lawnmowers`                    | Lawnmowers                    | weight    |
| 11  | `dive-bomber-push-ups`          | Dive-Bomber Push-Ups          | knee      |
| 12  | `back-flys`                     | Back Flys                     | weight    |

**Focus steps become 24:** steps 1–12 = the table above, round 1. Steps 13–24 = round 2 in this exact order (pairs (1,2)(3,4)(5,6)(7,8)(9,10)(11,12) each swapped):

`wide-front-pull-ups, standard-push-ups, reverse-grip-chin-ups, military-push-ups, closed-grip-overhand-pull-ups, wide-fly-push-ups, heavy-pants, decline-push-ups, lawnmowers, diamond-push-ups, back-flys, dive-bomber-push-ups`

Every other workout keeps today's behavior: one step per exercise, all its rounds on one card.

## 3. Current state — verified anchors

- `FocusPage.tsx:15-26` — module-private `resumeIndex(def, session)` returns the first exercise index whose entry has no data in any round.
- `FocusPage.tsx:70` — `const [idx, setIdx] = useState(() => resumeIndex(def, session))`.
- `FocusPage.tsx:79-82` — `const exercises = def?.exercises ?? []` … `const exercise = exercises[Math.min(idx, exercises.length - 1)]`.
- `FocusPage.tsx:178-180` — progress line `Exercise {idx + 1} of {exercises.length}`; `:193` — progress-bar width `((idx + 1) / exercises.length) * 100`; `:228` — `idx < exercises.length - 1` gates Next vs Finish.
- `entryUi.tsx:53` — `RoundInputs` renders `Array.from({ length: exercise.rounds }, (_, round) => {…})` — all rounds, always.
- `e2e/logging.spec.ts:47-85` — the focus-mode journey asserts `'Exercise 1 of 12'`, `'Exercise 2 of 12'`, clicks Next ×10 to `'Exercise 12 of 12'`, then Finish. **This test MUST be rewritten in US-098** (24 steps now).
- The finish card's PR/totals logic (`FocusPage.tsx:107-158`) is per-exercise and stays valid unchanged (steps don't alter entries' shape).

---

## 4. Story US-097 — `focusSteps` + step-aware `resumeIndex` in `src/lib` (S)

### 4.1 New file `src/lib/focusSteps.ts` — EXACT content

```ts
import type { CatalogExercise, WorkoutDef } from '@/lib/programData'
import type { Session } from '@/lib/schema'

/**
 * Focus-mode play order (E11). One step = one card: an exercise plus the subset
 * of its rounds entered on that card. Default is today's behaviour — one card
 * per exercise with every round on it. Workouts listed in ROUND_2_ORDER instead
 * play like the video: all round 1s in sheet order, then all round 2s in the
 * listed order. This is UX data, not workbook data — the sheets only store
 * R1/R2 columns — so it lives here by hand; catalog.json stays generated.
 */
export interface FocusStep {
  exercise: CatalogExercise
  /** 0-based round indices shown on this card */
  rounds: number[]
}

/** Round-2 pass order per workout key. Chest & Back swaps each push/pull pair. */
const ROUND_2_ORDER: Record<string, string[]> = {
  'chest-back': [
    'wide-front-pull-ups',
    'standard-push-ups',
    'reverse-grip-chin-ups',
    'military-push-ups',
    'closed-grip-overhand-pull-ups',
    'wide-fly-push-ups',
    'heavy-pants',
    'decline-push-ups',
    'lawnmowers',
    'diamond-push-ups',
    'back-flys',
    'dive-bomber-push-ups',
  ],
}

const allRounds = (exercise: CatalogExercise): FocusStep => ({
  exercise,
  rounds: Array.from({ length: exercise.rounds }, (_, round) => round),
})

export function focusSteps(def: WorkoutDef): FocusStep[] {
  const exercises = def.exercises ?? []
  const round2Ids = ROUND_2_ORDER[def.key]
  if (round2Ids !== undefined) {
    const byId = new Map(exercises.map((e) => [e.id, e]))
    const round2 = round2Ids
      .map((id) => byId.get(id))
      .filter((e): e is CatalogExercise => e !== undefined)
    // Only play the two-pass sequence while the hand-written order still matches
    // the generated catalog exactly; on any drift, fall back to plain cards.
    if (round2.length === exercises.length && exercises.every((e) => e.rounds === 2)) {
      return [
        ...exercises.map((e): FocusStep => ({ exercise: e, rounds: [0] })),
        ...round2.map((e): FocusStep => ({ exercise: e, rounds: [1] })),
      ]
    }
  }
  return exercises.map(allRounds)
}

/** Resume where the athlete left off: the first step with no data in its rounds. */
export function resumeIndex(steps: FocusStep[], session: Session | undefined): number {
  const first = steps.findIndex((step) => {
    const entry = session?.entries?.[step.exercise.id]
    if (entry === undefined) return true
    return step.rounds.every((round) => {
      const r = entry.rounds[round]
      return (r?.main ?? null) === null && (r?.secondary ?? null) === null
    })
  })
  return first === -1 ? Math.max(0, steps.length - 1) : first
}
```

### 4.2 New file `src/lib/focusSteps.test.ts` — EXACT content

```ts
import { describe, expect, it } from 'vitest'
import { focusSteps, resumeIndex } from './focusSteps'
import { getWorkout } from './programData'
import type { Session } from './schema'

const cb = getWorkout('chest-back')

describe('focusSteps', () => {
  it('plays chest & back as 24 single-round steps', () => {
    const steps = focusSteps(cb)
    expect(steps).toHaveLength(24)
    expect(steps.every((s) => s.rounds.length === 1)).toBe(true)
    expect(steps.slice(0, 12).every((s) => s.rounds[0] === 0)).toBe(true)
    expect(steps.slice(12).every((s) => s.rounds[0] === 1)).toBe(true)
  })

  it('keeps round 1 in sheet order and swaps each pair in round 2', () => {
    const steps = focusSteps(cb)
    const sheet = (cb.exercises ?? []).map((e) => e.id)
    expect(steps.slice(0, 12).map((s) => s.exercise.id)).toEqual(sheet)
    for (let pair = 0; pair < 6; pair++) {
      expect(steps[12 + 2 * pair].exercise.id).toBe(sheet[2 * pair + 1])
      expect(steps[13 + 2 * pair].exercise.id).toBe(sheet[2 * pair])
    }
    expect(steps.slice(12, 16).map((s) => s.exercise.id)).toEqual([
      'wide-front-pull-ups',
      'standard-push-ups',
      'reverse-grip-chin-ups',
      'military-push-ups',
    ])
  })

  it('covers every (exercise, round) pair exactly once', () => {
    const seen = new Set(
      focusSteps(cb).flatMap((s) => s.rounds.map((r) => `${s.exercise.id}#${r}`)),
    )
    expect(seen.size).toBe(24)
  })

  it('leaves non-sequenced workouts as one all-rounds card per exercise', () => {
    const sa = focusSteps(getWorkout('shoulders-arms'))
    expect(sa).toHaveLength(15)
    expect(sa.every((s) => s.rounds.length === s.exercise.rounds)).toBe(true)
    const arx = focusSteps(getWorkout('ab-ripper-x'))
    expect(arx).toHaveLength(11)
    expect(arx.every((s) => s.rounds.join() === '0')).toBe(true)
  })
})

describe('resumeIndex', () => {
  const steps = focusSteps(cb)
  const entry = (main: number | null, r2main: number | null = null) => ({
    rounds: [
      { main, secondary: null },
      { main: r2main, secondary: null },
    ],
  })

  it('starts at 0 with no session', () => {
    expect(resumeIndex(steps, undefined)).toBe(0)
  })

  it('skips steps whose round already has data', () => {
    const session: Session = {
      programDayId: 'd001',
      entries: { 'standard-push-ups': entry(9) },
    }
    expect(resumeIndex(steps, session)).toBe(1)
  })

  it('lands on step 13 (first round-2 card) once every round 1 is logged', () => {
    const entries = Object.fromEntries((cb.exercises ?? []).map((e) => [e.id, entry(10)]))
    expect(resumeIndex(steps, { programDayId: 'd001', entries })).toBe(12)
  })

  it('clamps to the last step when everything is logged', () => {
    const entries = Object.fromEntries((cb.exercises ?? []).map((e) => [e.id, entry(10, 8)]))
    expect(resumeIndex(steps, { programDayId: 'd001', entries })).toBe(23)
  })
})
```

### 4.3 Validate & commit

Pipeline from §0. Expected: 2 new test files' worth of green (suite grows by 8 tests), everything else untouched.

```
git add src/lib/focusSteps.ts src/lib/focusSteps.test.ts
git commit -m "feat(workouts): focus step sequences — chest & back round 2 plays pair-swapped"
```

**AC:** [ ] 24 steps for chest-back with the §2 order pinned by tests · [ ] every (exercise, round) exactly once · [ ] shoulders-arms/ARX unchanged shape · [ ] resumeIndex step-aware incl. the 12-logged → index 12 case · [ ] `src/lib` coverage includes the new file automatically.

---

## 5. Story US-098 — step-based FocusPage + single-round `RoundInputs` + e2e (M)

### 5.1 `src/features/workouts/entryUi.tsx` — two exact edits

**Edit A — signature.** Replace:

```ts
export function RoundInputs({
  workoutKey,
  exercise,
  occurrences,
  occIndex,
  sessions,
  drop,
}: {
  workoutKey: string
  exercise: CatalogExercise
  occurrences: ProgramDay[]
  occIndex: number
  sessions: Map<string, Session>
  drop: boolean | null
}) {
```

with:

```ts
export function RoundInputs({
  workoutKey,
  exercise,
  occurrences,
  occIndex,
  sessions,
  drop,
  rounds,
}: {
  workoutKey: string
  exercise: CatalogExercise
  occurrences: ProgramDay[]
  occIndex: number
  sessions: Map<string, Session>
  drop: boolean | null
  /** subset of 0-based rounds to render; omitted = all (grid view) */
  rounds?: number[]
}) {
```

**Edit B — round filter.** Replace the opening of the render loop:

```tsx
      {Array.from({ length: exercise.rounds }, (_, round) => {
```

with:

```tsx
      {Array.from({ length: exercise.rounds }, (_, round) => round)
        .filter((round) => rounds === undefined || rounds.includes(round))
        .map((round) => {
```

The loop body and its closing `})}` stay byte-identical (the `verdict` logic keeps working: a filtered round-2 card still gets the red/green drop header, Excel parity intact). The grid (`StrengthGrid.tsx`) passes no `rounds` prop and is pixel-identical.

### 5.2 `src/features/workouts/FocusPage.tsx` — exact edits

**Imports:** delete the now-unused local `resumeIndex` helper (lines 15–26) and the `import type { Session } from '@/lib/schema'` line; add:

```ts
import { focusSteps, resumeIndex } from '@/lib/focusSteps'
import { SECONDARY_LABELS } from './entryLabels'
```

**After** `const def = valid ? getWorkout(key) : null` **add:**

```ts
const steps = def === null ? [] : focusSteps(def)
```

**Replace** `const [idx, setIdx] = useState(() => resumeIndex(def, session))` **with:**

```ts
const [idx, setIdx] = useState(() => resumeIndex(steps, session))
```

**Replace** the two lines

```ts
  const exercises = def?.exercises ?? []
  if (exercises.length === 0) return <Navigate to={`/workouts/${key}`} replace />
  const day = occurrences[occIndex]
  const exercise = exercises[Math.min(idx, exercises.length - 1)]
```

**with:**

```ts
  const exercises = def?.exercises ?? []
  if (steps.length === 0) return <Navigate to={`/workouts/${key}`} replace />
  const day = occurrences[occIndex]
  const step = steps[Math.min(idx, steps.length - 1)]
  const exercise = step.exercise
  const prior =
    step.rounds.length === 1 && step.rounds[0] > 0
      ? session?.entries?.[exercise.id]?.rounds[step.rounds[0] - 1]
      : undefined
```

(`exercises` stays — the finish card and PR/history logic below still use it, unchanged.)

**Replace** the progress span

```tsx
<span>
  Exercise {idx + 1} of {exercises.length}
</span>
```

**with:**

```tsx
<span>
  Step {idx + 1} of {steps.length}
  {step.rounds.length === 1 && exercise.rounds > 1 ? ` · Round ${step.rounds[0] + 1}` : null}
</span>
```

**Replace** the progress-bar width expression `((idx + 1) / exercises.length) * 100` with `((idx + 1) / steps.length) * 100`.

**Directly after** the score `<p … aria-live="polite">…</p>` block, **insert** the round-1 context line:

```tsx
{
  prior !== undefined && ((prior.main ?? null) !== null || (prior.secondary ?? null) !== null) ? (
    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
      Round {step.rounds[0]}: {prior.main ?? '—'}
      {exercise.secondary !== undefined
        ? ` · ${SECONDARY_LABELS[exercise.secondary]}: ${prior.secondary ?? '—'}`
        : null}
    </p>
  ) : null
}
```

**Add** `rounds={step.rounds}` to the `<RoundInputs …/>` call (after `drop={result.drop}`).

**Replace** the Next/Finish gate `idx < exercises.length - 1` with `idx < steps.length - 1`.

Nothing else in the file changes — `historyNets`, the finished card, totals (`{totals.entered} of {exercises.length} exercises logged`) and `QuoteCard` remain exercise-based and correct.

### 5.3 Rewrite the focus-mode e2e (`e2e/logging.spec.ts` lines 47–85) — EXACT replacement test

Replace the entire `test('focus mode prefills, resumes, and finishes with a PR summary', …)` block with:

```ts
test('focus mode plays C&B as 24 steps, resumes, and finishes with a PR summary', async ({
  page,
}) => {
  await page.goto('#/today')
  await page.getByRole('link', { name: 'Log in focus mode' }).first().click()

  await expect(page.getByText('Step 1 of 24 · Round 1')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Standard Push-Ups' })).toBeVisible()

  // ghost prefill from the latest earlier session (week 2: 9 reps); one tap copies it
  const round1 = page.getByRole('textbox', { name: 'Standard Push-Ups round 1 reps' })
  await expect(round1).toHaveAttribute('placeholder', '9')
  await page.getByRole('button', { name: 'Increase Standard Push-Ups round 1 reps' }).click()
  await expect(round1).toHaveValue('9')

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Step 2 of 24 · Round 1')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Wide Front Pull-Ups' })).toBeVisible()

  // interrupted → re-entering resumes at the first unlogged step
  await page.goto('#/today')
  await page.getByRole('link', { name: 'Log in focus mode' }).first().click()
  await expect(page.getByText('Step 2 of 24 · Round 1')).toBeVisible()

  // round 2 starts at step 13 with the pair swapped: pull-ups before push-ups
  for (let i = 0; i < 11; i++) {
    await page.getByRole('button', { name: 'Next' }).click()
  }
  await expect(page.getByText('Step 13 of 24 · Round 2')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Wide Front Pull-Ups' })).toBeVisible()

  // the swapped partner follows, showing this session's round-1 value read-only
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Step 14 of 24 · Round 2')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Standard Push-Ups' })).toBeVisible()
  await expect(page.getByText('Round 1: 9 · knee reps: —')).toBeVisible()

  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: 'Next' }).click()
  }
  await expect(page.getByText('Step 24 of 24 · Round 2')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dive-Bomber Push-Ups' })).toBeVisible()
  await page.getByRole('button', { name: 'Finish workout' }).click()

  await expect(page.getByRole('heading', { name: /Workout complete/ })).toBeVisible()
  await expect(page.getByText(/Session score/)).toBeVisible()
  // 9 reps beats the best earlier net (week 2: 9 vs 8 → 8.5 − 0.5)
  await expect(page.getByText(/1 PR vs last time: Standard Push-Ups/)).toBeVisible()

  // finishing marked the session done on Today
  await page.getByRole('link', { name: 'Back to Today' }).click()
  const card = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Chest & Back' }) })
  await expect(card.getByText('Done', { exact: true })).toBeVisible()
})
```

Notes for the executor: `getByRole('heading', { name: 'Standard Push-Ups' })` also matches while other headings exist only if another heading contains that substring — none does (the grid isn't mounted in focus mode). The exercise heading itself stays plain `exercise.name`, so these locators are unambiguous. Do not touch the other two tests in the file.

### 5.4 Validate & commit

Full pipeline **including** `npm run build && npm run e2e` (both projects: chromium + mobile) and `npm run lhci`.

```
git add src/features/workouts/entryUi.tsx src/features/workouts/FocusPage.tsx e2e/logging.spec.ts
git commit -m "feat(workouts): step-based focus navigation with single-round cards"
```

**AC:** [ ] C&B focus = 24 steps in the §2 order; other workouts render exactly as before (one card, all rounds) · [ ] round-2 cards show `· Round 2` in the progress line, the red/green drop header, and the round-1 context line when round 1 has data · [ ] resume lands on the first unlogged step (step 13 after a full round-1 pass) · [ ] grid view byte-identical (no `rounds` prop passed) · [ ] rewritten e2e green on chromium AND mobile · [ ] Lighthouse ≥ 0.90 all three categories.

---

## 6. Story US-099 — docs & release (S)

1. Copy this file verbatim to `docs/epics/E11-chest-back-focus-sequence.md`.
2. Append to `docs/stories/README.md` (matching the existing E9/E10 section format):

```markdown
## E11 — Chest & Back focus sequence

- ✅ US-097 — focusSteps lib: 24-step C&B order, step-aware resume
- ✅ US-098 — step-based FocusPage, single-round cards, e2e rewrite

Post-v1.0.0. Full write-up: [`docs/epics/E11-chest-back-focus-sequence.md`](../epics/E11-chest-back-focus-sequence.md).
```

3. `npm version 1.3.0 --no-git-tag-version`
4. Prepend to `CHANGELOG.md` under the header block (above the `## 1.2.0` entry):

```markdown
## 1.3.0 — <today's date, YYYY-MM-DD>

- **E11 — Chest & Back focus sequence** (PR #<N>): focus mode plays Chest & Back
  as 24 single-round steps — round 1 in sheet order, round 2 with each push/pull
  pair swapped, matching the video. Grid, storage and scoring unchanged.
```

5. Validate (unit + build suffice here; no journey changed in this story), then:

```
git add docs/epics/E11-chest-back-focus-sequence.md docs/stories/README.md package.json package-lock.json CHANGELOG.md
git commit -m "docs(release): E11 epic doc, changelog 1.3.0, bump version"
git push -u origin claude/epic-e11-chest-back-focus-sequence
```

Open PR `E11 — Chest & Back focus sequence (v1.3.0)` with What/Why/How + the AC checklists of §4–§6. Watch CI (`gh pr checks <N> --watch`). **STOP when green — do not merge.**

## 7. Scenario matrix

| Scenario                                      | Expected                                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| C&B, nothing logged                           | Step 1 of 24 = Standard Push-Ups · Round 1                                                                        |
| C&B, all round 1 logged                       | Resume at Step 13 = Wide Front Pull-Ups · Round 2                                                                 |
| Round-2 card with round-1 data                | Context line `Round 1: <main> · <label>: <secondary>`; drop verdict colors the ROUND 2 header                     |
| Round-2 card, round 1 empty (skipped ahead)   | No context line; inputs work normally                                                                             |
| Partially-filled round counts as visited      | Any non-null main/secondary in the step's round ⇒ resume skips it                                                 |
| Shoulders & Arms / ARX / any other workout    | Steps = exercises, all rounds on one card — identical to 1.2.0                                                    |
| Catalog regenerated with changed ids (future) | Guard in `focusSteps` falls back to plain per-exercise cards; unit test `covers every pair` fails loudly on drift |
| Grid view                                     | Untouched; renders both rounds side by side as today                                                              |
| Finish from step 24                           | Same completion card, totals `x of 12 exercises logged`                                                           |

## 8. Out of scope

Sequences for other workouts (mechanism ready — add a key to `ROUND_2_ORDER` + tests); any timer behavior (E12); reordering inside the grid; storing the sequence in state or catalog.

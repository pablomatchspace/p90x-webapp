# Epic E19 — Yoga play: classic ↔ P90X3 variants

> **Status:** SPEC — awaiting build greenlight · **Stories:** US-119 → US-121 · **Branch:** `claude/epic-e19-yoga-play-variants`
> **Ships as:** package **1.19.121**, displayed **`1.E19.U121`** · **Schema:** **v4 → v5** (`settings.yoga`) · **Depends on:** E18 merged (package 1.18.118)
> **One-liner:** Yoga X days play either the **P90X Yoga X (classic)** timeline or the **P90X3 Yoga (30-min)** timeline — a persisted Settings preference with a per-launch override on the play screen. Both timelines are authored from the requirement doc; the classic transcript is truncated mid-workout and ships truncated by default (GD-E).

Execution blueprint. Data oracle: `specs/requirements/yoga.md` (contains BOTH variant documents verbatim). STOP and report on any precondition or anchor mismatch.

---

## 0. Executor contract

Repo root `p90x-webapp/`. Rules identical to E16 §0 (apply verbatim).

**Preconditions:** clean `main` after pull · version `1.18.118` (E18 merged) · `SCHEMA_VERSION = 4` with `MIGRATIONS` entries `1:`–`3:` · timelines registry supports `variant` (`getTimeline(workoutKey, variant?)` — E16 §5.2) · `../specs/requirements/yoga.md` exists · full suite green pre-change.

---

## 1. Design

- **Two timelines, one workout key** (`yoga-x`): `variant: 'classic'` and `variant: 'x3'`, both registered; `getTimeline('yoga-x', variant)` resolves (E16 already shipped the variant parameter for exactly this).
- **Persisted preference (schema v5):** `settings.yoga: z.enum(['classic', 'x3'])`, default `'classic'` (the program IS P90X Classic; X3 is the athlete's optional 30-minute substitution). Migration `4:` backfills. Settings screen gains the toggle; PlayPage's idle state gains a per-launch variant picker seeded from the setting (override NOT persisted — one-off choice; changing the lasting default lives in Settings).
- **Completion semantics unchanged:** whichever variant plays, finishing marks the same `yoga-x` session (status/notes/exerciseDone) — the schedule day is one Yoga X slot either way. The variant used is NOT stored (derived context, not raw input; notes are available if the athlete wants a record — see GD-F).
- **Transcription conventions** (same rulebook as E17/E18): single-pose holds with stated durations → timed; multi-pose chains without a total → flow (untimed, chain cue); chains whose sub-holds carry stated durations (X3 Warrior/Balance series) → split into consecutive timed segments sharing `exerciseId` (seamless); rep-marked tucks (`Knee-to-forehead tuck (3 times)`) stay inside their flow's cue; ranges → midpoint rounded to 15s (`~1-2 min` → 90, `1-2 min` Shavasana → 90) with the verbatim range kept in the cue (GD-D); `~30-45 seconds` chain holds (classic Warrior Series) have no per-pose breakdown → those entries are flows, holds guidance in cue.

### Decisions for Pablo (defaults apply unless overridden)

- **GD-D — ambiguous durations.** Default: range → midpoint rounded to 15s, verbatim range preserved in the cue (`Wide Forward Fold ~1-2 min` → 90s). Alternative: always the lower bound.
- **GD-E — classic transcript cutoff.** The classic doc ends mid-workout (Prayer Twist in Lunge, ~half of the 90-minute session). Default: ship truncated; final segment cue appends `'(transcript ends here — continue with the video)'`; summary label notes partial coverage. Alternative: pad from general Yoga X knowledge — rejected by default (invented data). Extend later by updating the requirement doc + data (data-only PR).
- **GD-F — record the variant played.** Default: not stored (schedule/logs identical either way). Alternative: auto-prefix the session note with `'X3 variant'` when x3 plays (no schema change) — say the word and the executor adds it to US-120.

### Amendments to prior epics

None. (E16's `variant` field and `getTimeline` signature were designed for this epic.)

---

## 2. Verified anchors (re-verify at build time, post-E18)

- `src/lib/schema.ts` — `SCHEMA_VERSION = 4`; `settingsSchema` has `player` (E16). US-120 appends `yoga`.
- `src/lib/migrations.ts` — entries `1:`–`3:`; US-120 appends `4:`.
- `src/lib/timelines/index.ts` — registry + `getTimeline(key, variant?)`; gains `yogaClassic`, `yogaX3`.
- `src/features/more/SettingsPage.tsx` — program card (Classic/Lean control) is the natural neighbor for the yoga-variant toggle; reuse its control styling.
- `src/features/workouts/PlayPage.tsx` — idle controls area (Start / auto-mark toggle) gains the variant picker, rendered only when `timelinesFor(key).length > 1`.

---

## 3. Story US-119 — both Yoga timelines + goldens (L)

Copy `../specs/requirements/yoga.md` → `docs/requirements/yoga.md` verbatim. New files `src/lib/timelines/yogaClassic.ts` and `src/lib/timelines/yogaX3.ts`, registered with `variant: 'classic'` / `'x3'`, titles `'Yoga X (classic)'` / `'Yoga (P90X3, 30 min)'`.

**Classic mapping (doc part 1):** §1 Warm-Up: 8 timed (Wide Forward Fold → 90 per GD-D). §2: 3 flows (vinyasa cycles; the ~30s Downward-Dog hold stays in the cue — the chain has no single total). §3: 2 timed 30s runner's poses (chain cues). §4 Warrior Series: 12 flows (chains with `~30-45s` holds — GD-D cue guidance, no invented per-pose splits). §5 Chair Series: 6 timed (30/15/30/15/30/15) + 1 flow (`Optional Brief Water Break` — untimed, cue verbatim; it is optional, so a wait not a timed break). §6: per doc order — flow (right core flow), 3 timed 30s (Right Angle/Extended/Bound), flow (exit), flow (left core flow), 3 timed 30s, flow (exit), flow (Prayer Twist — final segment, GD-E cutoff cue).

**X3 mapping (doc part 2)** — rule: stated holds become segments, transitions without stated durations ride in cues. §1: 4 timed (45/30/30/15). §2: 3 flows (Sun Salutation A rounds). §3: 6 timed 30s (Crescent/Airplane/Clasp per side, entry/exit in cues). §4: 8 timed (W1 15, W2 15, RevW 15, Bound Side Angle 30 per side) + Chair 30 timed + exit flow. §5: 8 timed 30s (W3, Half Moon, Revolved Half Moon, Standing Splits per side) + Chair 30 timed + exit flow. §6: 5 timed (45 + 4×30). §7: 7 timed 30s (Crow's chaturanga/child's-pose exit in its cue). §8: timed floor series (Cat/Cow 45; Bird Dogs 2×30; Camel 30; Figure-4 series 2×(4×30); Plow 30; Shoulder Stand 30; Roll Down 15; Fish 30; Shavasana 90 per GD-D).

Golden pins (derived at spec time — **recompute during transcription; the doc wins, then adjust; record reconciliation in the PR**):

- Classic: **43** segments — **21** untimed flows (§2 3 + §4 12 + §5 water 1 + §6 five: two core flows, two exits, prayer twist) + **22** timed (§1 8 · §3 2 · §5 6 · §6 6); timed sum = **735s** with the GD-D choices (§1 360 + §3 60 + §5 135 + §6 180); final segment cue carries the GD-E note; `loggedExerciseIds` empty (posture practice — completion is the record, mirrors GD-B).
- X3: timed sum = **1695s** (≈28 min — sanity-matches the 30-minute format; §1 120 + §3 180 + §4 180 + §5 270 + §6 165 + §7 210 + §8 570); untimed flows **5** (3 Sun Salutation A rounds + §4 exit + §5 exit); `loggedExerciseIds` empty.
- Both: ids unique; every non-first instance head `leadIn: 5`, splits/chained holds seamless; no `kind: 'break'` segments; classic total runtime ≪ x3 runtime is NOT asserted (truncation makes it meaningless) — assert only per-variant pins.

Commit: `feat(timelines): Yoga play timelines — classic (truncated transcript) and P90X3` (doc copy + 2 data files + tests + registry).

**AC:** [ ] both docs transcribed item-for-item, order preserved, no invented durations beyond GD-D midpoints (each carrying the verbatim range in its cue) · [ ] cutoff note on classic's final segment · [ ] `getTimeline('yoga-x','x3')` and `('yoga-x','classic')` resolve; bare `getTimeline('yoga-x')` returns classic (registry order — pin it).

---

## 4. Story US-120 — schema v5 `settings.yoga` + Settings toggle + PlayPage picker (M)

1. `src/lib/schema.ts`: line 8 `4` → `5`; in `settingsSchema` after `player: …`:

```ts
  /** E19: which Yoga timeline plays on Yoga X days */
  yoga: z.enum(['classic', 'x3']),
```

   `emptyState()`: `yoga: 'classic',` after `player`.
2. `src/lib/migrations.ts` — append after `3:`:

```ts
  // v4 → v5 (E19): yoga variant preference.
  4: (doc) => {
    const settings = doc.settings as { yoga?: unknown } | undefined
    if (settings !== undefined && settings.yoga === undefined) settings.yoga = 'classic'
  },
```

3. `migrations.test.ts`: extend `docAt` to `1 | 2 | 3 | 4`; v1→v5 chain lands all defaults; v4 keeps custom player/timer/ffmi and gains `yoga: 'classic'`.
4. `src/state/actions.ts`: `updateYogaVariant(variant: Settings['yoga'])` (mirror `updatePlayerSettings`).
5. `SettingsPage.tsx`: in the program card, a two-option control `Yoga timeline: Classic (90 min) / P90X3 (30 min)` → `updateYogaVariant` (styling copied from the Classic/Lean control; no confirm needed — nothing re-derives).
6. `PlayPage.tsx`: idle state, when `timelinesFor(key).length > 1`: `aria-pressed` pill pair (`Classic` / `P90X3 30-min`) — local state seeded from `settings.yoga`, used for `getTimeline(key, chosen)`; NOT persisted (per-launch override).
7. e2e (`e2e/play.spec.ts` extension): Settings toggle persists across reload; a Yoga day's play screen defaults to the setting and can be overridden for that launch; overriding does not change Settings.

Commit: `feat(settings): schema v5 — yoga variant preference with per-launch override`.

**AC:** [ ] v1–v4 docs migrate to v5 with `yoga: 'classic'` · [ ] caller's doc never mutated · [ ] picker hidden for single-variant workouts (Plyo/Kenpo/Stretch/Cardio) · [ ] override is launch-scoped only.

---

## 5. Story US-121 — docs & release (S)

1. Copy spec → `docs/epics/E19-yoga-play-variants.md`; append E19 section to `docs/stories/README.md`.
2. `npm version 1.19.121 --no-git-tag-version`.
3. CHANGELOG:

```markdown
## 1.E19.U121 (package 1.19.121) — <date>

- **E19 — Yoga play variants** (PR #<N>): Yoga X days play the classic timeline
  (transcript-faithful, truncated where the transcript ends) or the P90X3
  30-minute timeline — persisted preference in Settings (schema v5) with a
  per-launch override on the play screen.
```

4. Validate, commit (`docs(release): E19 epic doc, changelog, 1.E19.U121`), push, PR `E19 — Yoga play variants (1.E19.U121)`. **STOP when green — do not merge.**

---

## 6. Scenario matrix

| Scenario | Expected |
| --- | --- |
| Fresh state / migrated v1–v4 | `settings.yoga === 'classic'` |
| Yoga day, default | classic timeline; final segment carries the transcript-end note |
| Settings → P90X3 | subsequent Yoga plays default to x3; persists across reload |
| Per-launch override | picker changes THIS session only; Settings unchanged |
| X3 balance series | stated 30s sub-holds play as seamless timed segments; exits are Done-to-advance flows |
| Classic Warrior Series | flows with hold-guidance cues; no invented per-pose timers |
| Optional water break (classic) | untimed wait, skippable |
| Completion | one `yoga-x` session either way; auto-mark setting honored; variant not stored (GD-F default) |
| Regression | E16–E18 timelines, engine, FocusPage, existing migrations — untouched and green |

## 7. Out of scope

Completing the classic transcript past the cutoff (data-only follow-up when Pablo supplies the remainder); per-variant scheduling or program-template changes (the day stays `yoga-x`); storing the variant per session (GD-F alternative); Plyometrics/Kenpo/Stretch/Cardio changes.

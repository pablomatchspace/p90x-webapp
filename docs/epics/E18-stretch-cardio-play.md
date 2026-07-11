# Epic E18 — X Stretch + Cardio X play timelines (data-only)

> **Status:** SPEC — awaiting build greenlight · **Stories:** US-116 → US-118 · **Branch:** `claude/epic-e18-stretch-cardio-play`
> **Ships as:** package **1.18.118**, displayed **`1.E18.U118`** · **Schema:** unchanged (SCHEMA_VERSION stays 4) · **Depends on:** E17 merged (package 1.17.115)
> **One-liner:** X Stretch and Cardio X join play mode as pure data adds (Q19): timed holds count down, flow chains (sun salutations, vinyasa entries) are untimed Done-to-advance segments, rep drills reuse E17's wait mechanics. Zero engine/UI changes.

Execution blueprint. Data oracles: `specs/requirements/x-stretch.md` and `specs/requirements/cardio-x.md`. STOP and report on any precondition or anchor mismatch.

---

## 0. Executor contract

Repo root `p90x-webapp/`. Rules identical to E16 §0 (restated there; apply verbatim — commits, validation pipeline, explicit staging, never merge, PR-26 smoke suite untouched, frozen files untouched).

**Preconditions:** clean `main` after pull · version `1.17.115` (E17 merged — STOP if not) · `SCHEMA_VERSION = 4` · untimed-wait support present (`src/lib/playback.ts` `stepSeconds?: (number | null)[]`) · both requirement docs exist under `../specs/requirements/` · full suite green pre-change.

---

## 1. Design (pure data; two mapping conventions)

- **Flow segments** (multi-pose chains without one total duration — sun salutation rounds, vinyasa-linked sequences): `seconds: null`, **no `reps`**, `cue` = the full chain text verbatim (`'Arms up -> Swan dive -> … -> Reverse Swan Dive'`). E17's wait UI already renders cue + **Done — next** when `reps` is absent.
- **Split flattening (Q14, same rule as Plyo):** any `As X / Bs Y` or phased item becomes consecutive segments sharing `exerciseId`, seamless (no lead-in between halves): Spinal Twist 15L+15R; Shoulder Circles 80s → 4 × 20s phases; Standing Quad/Side stretches L/R; Squat Run 30L+30R; Standing Split-Leg & Pyramid L/R are separate doc items already (own instances). Items marked `total` with internal cycles but no fixed sub-durations (Head Rolls 60s '6 cycles', Dreya Forearm 60s '2 cycles', Pigeon 'Left & Right 60s total') stay ONE timed segment with the cycle text as cue — the doc gives no split durations; inventing them is prohibited.
- **Timed items with chains in the doc** (Cardio X yoga warm-up poses: 'Warrior One (Right)… 30s… Vinyasa exit'): timed 30s segments, chain text in `cue`.
- **Lead-ins:** `leadIn: 5` on the first segment of every exercise instance except the timeline's first segment; none within splits; none on breaks (Cardio X has no water breaks; X Stretch none).
- **Logging:** `loggedExerciseIds` — Cardio X: the rep drills (Kenpo series 10 + Squat/Cross/X-Press + Steam Engine = **12**). X Stretch: **empty** (GD-B).
- **Transcript cutoff:** X Stretch's doc ends at Child's Pose (Left) `[Transcript Cutoff]` — the workout is essentially complete (cool-down last item). Ship verbatim; the final segment's cue appends `'(transcript ends here)'` (GD-C).

### Decisions for Pablo (defaults apply unless overridden)

- **GD-B — X Stretch logging.** Default: no per-move logging (stretch session — completion status is the record). Alternative: log all moves.
- **GD-C — cutoff handling.** Default: ship the transcript verbatim with an end-note cue on the final segment. Alternative: pad the cool-down from general workout knowledge (rejected by default — invented data).

### Amendments to prior epics

None.

---

## 2. Verified anchors (re-verify at build time, post-E17)

- `src/lib/timelines/{types,index}.ts` — `PlaySegment.seconds: number | null`, registry array (gains `xStretch`, `cardioX`).
- `src/features/workouts/PlayPage.tsx` — wait branch renders cue-only when `reps` absent (E17 §3.3); if it hard-requires `reps`, STOP and report (spec mismatch).
- `e2e/play.spec.ts` — extend, do not rewrite.

---

## 3. Story US-116 — X Stretch timeline + goldens (M)

Copy `../specs/requirements/x-stretch.md` → `docs/requirements/x-stretch.md`. New `src/lib/timelines/xStretch.ts`, registered.

Structure: 9 sections named as the doc. Section 1 = 3 flow segments (Sun Salutation Rounds 1–3, chains verbatim in cues, `seconds: null`). All other sections timed, with Q14 splits (Spinal Twist → 2×15; Shoulder Circles → 4×20; Side Stretch L/R etc. where the doc gives per-side durations).

Golden pins (derived at spec time — recompute during transcription; the doc wins, then adjust the pin; record the reconciliation in the PR):

- Untimed segments: exactly **3** (the sun-salutation flows), all rep-less.
- Sum of timed `seconds` = **2120** (invariant under flattening — it is the sum of the doc's listed durations: 255 + 120 + 350 + 270 + 525 + 330 + 180 + 90 per sections 2–9).
- Segment count: computed during transcription (flattening adds segments; splits with stated sub-durations only) — assert the computed number as a pin with a comment listing per-section counts.
- `loggedExerciseIds` empty (GD-B); no breaks; ids unique; final segment cue ends `'(transcript ends here)'` (GD-C); every non-first instance head `leadIn: 5`.

Commit: `feat(timelines): X Stretch play timeline` (doc copy + data + test + registry).

**AC:** [ ] every doc item once, in order; no invented sub-durations · [ ] 2120s timed total pinned · [ ] flows are Done-to-advance · [ ] cutoff note present.

---

## 4. Story US-117 — Cardio X timeline + goldens (M)

Copy `../specs/requirements/cardio-x.md` → `docs/requirements/cardio-x.md`. New `src/lib/timelines/cardioX.ts`, registered.

Structure: 6 sections. §1 warm-up timed (Standing Quad Stretch → 30R+30L split). §2 yoga warm-up: 2 flow segments (Sun Salutation Vinyasas 1–2) + 8 timed 30s pose segments (chain cues). §3 Kenpo: 10 untimed rep drills (reps = primary count, detail in cue — `'6 full combinations (18 total kicks)'` etc.). §4 Plyo: 10 timed 30s segments (`— Round 1/2` sections, Jump Shot round-difference in cues per doc). §5 core: Squat/Cross/X-Press reps 30 (cue: last-10-jump-squats), Steam Engine reps 50, Dreya Roll timed 60, Squat Run → 30L+30R split, Superman/Banana ONE timed 60 (alternating on cue — Q21e pattern). §6 cool-down timed (Quad Stretch → 30R+30L).

Golden pins (same recompute-and-reconcile rule):

- Untimed segments **14** total: 2 flows (Sun Salutation Vinyasas) + 12 rep drills (10 Kenpo series + Squat/Cross/X-Press + Steam Engine).
- Sum of timed `seconds` = **1305** (300 + 240 + 300 + 180 + 285 across §1, §2-timed, §4, §5-timed, §6 — invariant under flattening).
- `loggedExerciseIds.length === 12` (the rep drills; GD default), all untimed-with-reps ids ∈ set, flows excluded.
- No breaks; ids unique; per-section counts asserted with a comment; every non-first instance head `leadIn: 5`, splits seamless.

Commit: `feat(timelines): Cardio X play timeline` (doc copy + data + test + registry).

Extend `e2e/play.spec.ts` with one compact assertion block per new workout (Play button on its day; first segment renders; one flow/drill shows `Done — next`). Full pipeline + build + e2e + lhci before commit (journeys touched).

**AC:** [ ] every doc item once, in order · [ ] 1305s timed total pinned · [ ] 12 logged drills · [ ] flows/drills wait correctly · [ ] Plyo/Kenpo timelines and e2e untouched.

---

## 5. Story US-118 — docs & release (S)

1. Copy spec → `docs/epics/E18-stretch-cardio-play.md`; append E18 section to `docs/stories/README.md`.
2. `npm version 1.18.118 --no-git-tag-version`.
3. CHANGELOG:

```markdown
## 1.E18.U118 (package 1.18.118) — <date>

- **E18 — X Stretch + Cardio X play** (PR #<N>): both workouts join play mode as
  data-only timelines — timed holds, Done-to-advance flows and rep drills;
  Cardio X logs its 12 drills done/skipped. No engine or schema changes.
```

4. Validate, commit (`docs(release): E18 epic doc, changelog, 1.E18.U118`), push, PR `E18 — X Stretch + Cardio X play (1.E18.U118)`. **STOP when green — do not merge.**

---

## 6. Scenario matrix

| Scenario | Expected |
| --- | --- |
| X Stretch sun salutations | 3 flow waits with full chain cues; Done advances |
| Shoulder Circles | 4 seamless 20s phases, beep each switch, one get-ready before the first |
| Head Rolls / Dreya / Pigeon | single timed segments; cycle text as cue (no invented splits) |
| X Stretch summary | no checklist (nothing logged); status/notes only |
| Cardio X yoga warm-up | flows wait; pose holds count down 30s |
| Cardio X kenpo/core drills | rep waits, logged done/skipped, checklist of 12 |
| Squat Run / Quad stretches | L/R splits seamless |
| Transcript cutoff (X Stretch) | final Child's Pose cue notes the transcript end |
| Regression | Plyo + Kenpo timelines, FocusPage, schema — all untouched |

## 7. Out of scope

Yoga (E19); logging for X Stretch (GD-B alternative); padding truncated transcripts (GD-C alternative); any engine/UI change (if one proves necessary, STOP — that's a spec error to report).

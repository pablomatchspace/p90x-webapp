# Changelog

One entry per merged epic. From E16 onward, package semver maps to the
`1.E{epic}.U{story}` display format; this supersedes E13's minor/patch rule.
The bump and its entry land inside the epic's own PR, so the deployed app
(More → Help) always names the last merged epic.

From the first post-1.E20.U128 hotfix onward, bug-fix-only releases (no new
story) append a bug-release counter: package `-bN` prerelease suffix →
display `1.E{epic}.U{story}.B{NN}` (zero-padded). A fresh story release
carries no suffix and displays `B00` — nothing's been fixed against it yet.
Each bug fix increments N from the last one merged against the _same_ story;
a new story resets it to B00. PRs #33 and #34 predate this convention and
didn't bump the package version — they're numbered B01/B02 here for a
continuous record; #33's package column is left at the un-suffixed version
that was actually shipped.

## 1.E31.U158.B02 (package 1.31.158-b2) — 2026-07-17

Second bugfix batch. Resolves functional and state-management discrepancies discovered during validation.

- **Fix: Workout session and log residue database bloat.** Clearing all round values, notes, annotations, completion markers, or completion status from a workout session now completely garbage-collects the empty session and empty log from state, preventing sync and export payload database bloat.
- **Fix: Weight loss color thresholds for gaining targets.** Configures `lossThreshold` to detect if target weight >= start weight. Evaluates boundaries correctly based on weight gain relative to target gain instead of assuming only weight loss, resolving target coloring mismatches for muscle building / FFMI goals.
- **Fix: Navy body fat height parameter initialization.** Pre-fills the height input in the Navy body fat calculator directly from settings, converting automatically to the active unit.
- **Fix: Custom quote blank editor onBlur desync.** Restores the original quote text visually in the motivation editor if the user blurs the input while empty.
- **Fix: Rest timer custom input preset reset.** Ensures clicking preset options completely clears custom draft buffers.

## 1.E31.U158.B01 (package 1.31.158-b1) — 2026-07-16

Adversarial re-review of E31 (8 independent finder passes: line-by-line diff,
removed-behavior audit, cross-file trace, reuse, simplification, efficiency,
altitude, CLAUDE.md conventions). Two real bugs and several completeness gaps
confirmed and fixed; findings that turned out to be deliberate, already-made
architecture decisions (barrel-granularity vs. bundle size; the migration
walker's hand-enumerated call sites) are left as documented tradeoffs, not
re-litigated.

- **Fix: migration could crash the app on boot instead of degrading
  gracefully.** The v12→v13 migration step (U156) assumed every renamed
  container was an array, and — one level deeper — that every _element_
  inside an otherwise-valid array was itself a plain object. A hand-edited or
  partially-corrupted-but-valid-JSON document (`"rounds": {}` instead of an
  array; or a well-formed `sessions` array containing a `null` element; same
  for `entries` and `rounds`) threw an uncaught `TypeError` during the rename
  walk. `loadState()` runs at module-load time, so this crashed the entire
  app at boot instead of showing the documented corrupt-storage recovery
  banner (CLAUDE.md: "loading an old/corrupt document must degrade to a clean
  empty state with a recovery offer, never a crash"). Fixed with an
  `isRecord` guard at every level of the walk (container _and_ element), so a
  malformed value is skipped rather than dereferenced; the archive is still
  moved to its new field name without reshaping it, so Zod's validation at
  the end of `migrateToCurrent` continues to correctly reject a malformed
  document as corrupt — matching the pre-refactor behavior exactly, just
  under the renamed field. Seven new failing-test-first cases cover both the
  container-shape and element-shape scenarios at each depth.
- **Fix: `ScheduleOp.createdAt` bypassed the U158 clock port.** `newSkipOp`/
  `newSwapOp`/`newRemapOp` (`lib/schedule/ops.ts`, unrelated to this epic's
  own commits but audited as part of verifying the clock port's completeness)
  stamped `createdAt` via a direct `new Date()` call inside otherwise-pure
  domain code — the one remaining persisted timestamp that didn't go through
  `clock.nowISO()`, contradicting the U158 CHANGELOG's own claim. `createdAt`
  is now a required parameter, supplied by the two call sites
  (`RescheduleSection.tsx`, `WeeklyEditorPage.tsx`) from the clock port.
- **Fix: `Sex` type still duplicated after U154.** U154's commit explicitly
  said it unified the duplicate `Sex` type, but only `feasibility.ts` was
  updated — `nutrition.ts` still declared two inline `'male' | 'female'`
  unions. Now imports `Sex` from `@/lib/body` like `feasibility.ts` does.
- **Fix: dead `PersistencePort`/`SyncPort` conformance scaffolding.** U158
  added `persistencePort`/`syncPort` consts described as "the seam main.tsx
  plugs in," but `main.tsx` still called `attachPersistence()`/`attachSync()`
  directly — nothing consumed the ports. `main.tsx` now goes through
  `persistencePort.attach()` / `syncPort.attach()`, making the seam real.
- **Fix: `restoreBackup` didn't emit `documentReplaced`.** It performs the
  same wholesale document swap as `replaceData`, which does emit the event —
  the omission was a live inconsistency in the store's own lifecycle-event
  contract (no current subscriber, but the next one to rely on
  `documentReplaced` firing for "every full replacement" would have silently
  missed backup restores).
- **Simplify:** removed the redundant `active`/`clock` indirection in
  `state/ports.ts` (no caller destructures `clock`, so a live `let` binding
  reassigned by `setClock`/`resetClock` is equivalent and simpler).
- **Efficiency:** `architecture.test.ts`'s `importSpecifiers` is now memoized
  — it was re-parsing every file in `src/lib` from disk up to 4× per test
  run, once per `it()` block that scans the same file list.
- Also strengthened `architecture.test.ts` to scan `vi.mock`/`require`
  specifiers and reject `zustand`/`immer` imports from the domain layer, and
  refreshed `docs/PRD.md`'s document-shape example and `docs/CONTEXT-MAP.md`
  /`CLAUDE.md`'s module lists, which had drifted from the finished U157/U158
  layout.

## 1.E31.U158 (package 1.31.158) — 2026-07-16

- **E31 — Domain-driven design alignment, story U158: ports & typed store
  events.** The application layer's impure dependencies now sit behind
  `state/ports.ts`: actions stamp `loggedAt`/`createdAt`/`archivedAt` through
  an injected `clock.nowISO()` (swappable in tests), and the persistence and
  sync wirings are declared as `PersistencePort`/`SyncPort` contracts. The
  store emits typed lifecycle events — `reset` and `documentReplaced` — and
  the sync engine subscribes to `reset` like any other consumer, replacing
  the bespoke mutable `setResetListener` hook. Behavior identical (reset
  still pauses sync before the debounced push can clobber the cloud copy);
  journeys + sync e2e green.

## 1.E31.U157 (package 1.31.157) — 2026-07-16

- **E31 — Domain-driven design alignment, story U157: application layer &
  domain invariants.** Every business rule that lived in the 500-line
  `actions.ts` (or implicitly in the UI) is now a named, unit-tested pure
  function in its bounded context: session upsert & the lazy-create/prune
  entry rule (`workouts/sessions`), timer/player/scoring guards
  (`workouts/playerSettings`, `applyScoringPatch`), the sorted/prune body-log
  upsert (`body/bodyLog`), the never-overwrite program-start guard
  (`schedule/program`), the round freeze/seed/restore rules
  (`rounds/archive`), nutrition-override and media-link guards, and the
  custom-quote list rules. `actions.ts` is now a barrel over six thin
  per-context use-case modules (`src/state/actions/*`) — call sites are
  unchanged. The architecture test gains a layering rule: UI components never
  touch the store's `mutate`/`getState` — writes go through the application
  layer. Behavior identical; 28 new domain tests pin the extracted rules.

## 1.E31.U156 (package 1.31.156) — 2026-07-16

- **E31 — Domain-driven design alignment, story U156: persisted-field renames
  (schema v13).** The document now speaks the glossary's language: the
  top-level `rounds` archive is `archivedRounds` (no longer colliding with an
  entry's exercise rounds), the cardio COMPLETED? dropdown is
  `session.completion` (no longer shadowing the `completed` boolean), and the
  exercise-round pair `main`/`secondary` is `reps`/`assist` (`assist` holds
  knee/chair reps, the R×W weight, or the other-side count — and no longer
  collides with the catalog's `exercise.secondary` row kind). Migration
  12→13 renames in place — live logs and every archived round's logs — with
  values untouched; older exports (including the shipped v1
  `sample-data.json`) still import through the full chain. Display labels,
  scoring, and all derived numbers are unchanged.

## 1.E31.U155 (package 1.31.155) — 2026-07-16

- **E31 — Domain-driven design alignment, story U155: branded unit value
  objects.** The canonical metric storage units are now branded types in
  `shared/units.ts` — `Kg`, `Meters`, and `BodyFraction` (a 0–1 composition
  fraction covering body fat, water and bone) — applied to every
  unit-carrying schema field (settings height/startWeight/startBodyFat,
  limits, targets, body-log entries, round snapshots). Assigning a raw or
  wrongly-converted number to a canonical field is now a compile error;
  values are constructed at the existing conversion boundary (`unitToKg`,
  `unitToM`, `percentToFraction`, the body-fat calculators, `planFromFfmi`).
  Brands are compile-time only: constructors are pure casts and the schema's
  runtime validation is byte-for-byte unchanged, so no document, import, or
  formula behaves differently.

## 1.E31.U154 (package 1.31.154) — 2026-07-16

- **E31 — Domain-driven design alignment, story U154: physical bounded
  contexts.** `src/lib` is reorganized into the seven context directories the
  context map named — `schedule/`, `workouts/`, `body/`, `nutrition/`,
  `rounds/`, `sync/`, `shared/` — each publishing its API through an
  `index.ts` barrel. A new `architecture.test.ts` enforces the rules in
  `npm run test`: every module lives in a context, cross-context imports go
  through the barrel and respect the allowed-dependency DAG, contexts never
  import their own barrel, and the domain layer never imports state or UI.
  Two identical `Sex` types (bodyFat, feasibility) are unified. Pure
  restructure: no behavior, formula, or persisted-schema changes — the full
  suite runs unchanged.

## 1.E31.U153 (package 1.31.153) — 2026-07-16

- **E31 — Domain-driven design alignment, story U153: ubiquitous language.**
  New [`docs/GLOSSARY.md`](docs/GLOSSARY.md) pins the app's vocabulary to the
  workbook's (term → schema field → code identifier), and
  [`docs/CONTEXT-MAP.md`](docs/CONTEXT-MAP.md) names the seven bounded
  contexts of `src/lib` (schedule, workouts, body, nutrition, rounds, sync,
  shared) with their allowed-dependency matrix — the map U154 will make
  physical. One code-internal rename resolves the glossary's worst collision:
  the `Round` type (an exercise's attempt column) is now `ExerciseRound`,
  distinct from a 90-day round (`ArchivedRound`). No persisted-schema or
  behavior changes.

## 1.E30.U152 (package 1.30.152) — 2026-07-16

- **E30 — Voice rep entry in focus mode.** The focus card grows a
  **push-to-talk mic** (Web Speech recognition, pinned en-US,
  feature-detected — browsers without it simply don't render the button).
  Say **"reps 22, knee 8"** and the values land in the named fields through
  the ordinary `setRoundValue` pipeline, so ghosts, drop verdicts and E29
  targets react as if typed; bare numbers fill the card's fields positionally
  from the first empty one, "round 2 …" scopes values on multi-round cards,
  and numbers work as digits or words ("twenty-two", "a hundred and five",
  "and a half"). Whole-utterance **"next" / "previous" / "finish workout"**
  drive the card buttons (U150 pure parser, U151 mic UI). An opt-in
  **Hands-free** toggle (persisted `player.voiceHandsFree`, **schema v11 →
  v12** with migration, default off) re-arms the mic after every utterance —
  a whole strength session logs without touching the screen; arming always
  requires a tap and no audio or transcript is ever stored. `aria-live`
  feedback echoes what was heard; denied mics degrade to a message. Help
  gains an **Audio & voice** guide — the E26 cues explained plus a voice
  phrasebook. New `e2e/voice.spec.ts` journey (stubbed recognizer, incl. an
  unsupported-browser case) and refreshed linux visual baselines for the
  focus cards and Help (U152).

## 1.E30.U152.B01 (package 1.30.152-b1) — 2026-07-16

- **Working agreement: TDD + decision gate (CLAUDE.md, no app code).** Agent
  instructions now mandate test-driven development — red-green-refactor for
  `src/lib`/`src/state`/`worker`, a failing reproduction test before any bug
  fix, and behavior-focused test discipline — plus a new non-negotiable rule 6:
  every product-scope, ambiguity, requirement, or trade-off decision (features
  and bug fixes alike, however small) is batched and put to the user as options
  with a recommendation before any code is written.

## 1.E29.U149 (package 1.29.149) — 2026-07-16

- **E29 — Progressive-overload targets in focus mode.** Focus mode now states
  the goal before the set instead of only judging it afterwards. Each exercise
  card shows **`Target: beat N`** — the latest earlier logged net score in
  this round (U147, same walk-back as ghost prefill so skipped weeks don't
  blank it), falling back per exercise to the **newest archived round that
  logged it** (E28) with that round's frozen scoring snapshot, so day 1
  of round 2 still has a number to chase. The line tints live as entries land
  (U148): emerald when beaten, amber when matched/behind. The finish summary
  adds **`Targets beaten: X of Y`** alongside the PR line — target = beat
  _last time_, PR = beat _all_ history. Nothing stored (rule 2); new
  `e2e/overload.spec.ts` journey and refreshed linux focus-mode visual
  baselines (U149).

## 1.E28.U146 (package 1.28.146) — 2026-07-15

- **E28 — Round lifecycle: archive, end-of-round report & round-over-round
  comparison.** A 90-day round can now end without export-and-reset. Schema
  v11 adds a top-level `rounds` archive (U143): **More → Rounds** completes
  the running round with a guarded flow — label, an opt-in that seeds the
  next round's SETUP start stats from the latest weigh-in, an export nudge —
  moving its ops/logs/weigh-ins plus a frozen snapshot of the round-scoped
  SETUP inputs (scoring params, height, start stats, targets, limits) inside
  the document, then resetting the app for round 2; archives restore (while
  no round runs), rename and delete (U145). The **round report** (U144,
  `/rounds/live` + `/rounds/:id`) turns day 90 into a deliverable: adherence
  headline, body first→last deltas against targets, per-workout net-score
  first→last and cross-workout top movers — all recomputed by the existing
  engines from the frozen raw inputs, so an archived report never shifts when
  later rounds retune Settings; the Dashboard gains a round-complete card
  once the last program day is reached. **Round-over-round** (U146) overlays
  any other round on the report: body metrics aligned by day-of-round,
  workout net totals by occurrence index (reschedule-tolerant), plus
  adherence side by side — the other round always dashed grey.

## 1.E27.U142.B02 (package 1.27.142-b2) — 2026-07-15

- **Bug fix**: the Today nutrition card showed the P90X booklet's daily calories
  (1,800) and the evidence-based target (2,400) as two same-weight numbers with no
  explanation, reading as contradictory instructions. `Your target` — the
  goal-tuned, evidence-based recommendation — now leads the card with a one-line
  explainer ("aim for one daily intake, not both"); the booklet's plan is tucked
  behind a `P90X booklet plan` disclosure (auto-expanded only when no personal
  target exists yet, so a number always shows).

## 1.E27.U142.B01 (package 1.27.142-b1) — 2026-07-15

- **Body-trends chart legibility (bug fix).** Two follow-up fixes to the E25
  charts after real-data feedback:
  - The 7-day trend overlay now draws in a neutral grey instead of the metric's
    own colour. On a sparse chart the blue metric line, its dotted
    carried-forward span, and the blue dashed trend were three near-identical
    blue strokes; the grey trend now reads clearly as a separate, derived line.
  - The body-composition chart plots fat on its own right-hand y-axis (`LineChart`
    gains an opt-in `axis: 'left' | 'right'` per series). Lean (~57 kg) and fat
    (~11 kg) no longer share one scale that flattened both lines against the
    edges — each axis auto-scales to its series and is tinted to match it, so the
    recomposition (lean up, fat down) is actually visible. Single-axis charts are
    byte-identical (visual baselines unchanged).

## 1.E27.U142 (package 1.27.142) — 2026-07-14

- **E27 — Workout media deeplinks in focus & play mode.** Focus mode and guided
  play mode now render the same E23 `MediaLinks` launch buttons as the Today
  card and workout detail screen (U142): a workout's configured video/audio
  deeplinks open in a new tab right next to the step/idle controls, so the
  session video can be launched — or relaunched mid-session, since play mode
  keeps the buttons visible during playback too — without leaving the play
  flow. Renders nothing until a link is configured in Settings, exactly like
  the other surfaces.

## 1.E26.U141 (package 1.26.141) — 2026-07-14

- **E26 — Audible play-mode coaching: distinct rest beep & spoken exercises.**
  Rest phases now sound different from work phases (U140): a work/next-step
  switch keeps the brisk double 880 Hz chirp, a rest start plays a lower
  falling 660→440 Hz two-tone — `beep(kind)` in `timerUtils`. Play mode and
  focus-mode playback also speak the workout aloud (U141) via the Web Speech
  API: the opening exercise at Start, an up-next announcement when a
  get-ready/rest begins (worded to match each screen's own heading —
  "Get ready. Up next: <exercise>" in play mode, "Rest. Up next: <exercise>"
  in focus mode), the next exercise's name when its work slot starts,
  and a completion line at the end. Announcements are governed by a new
  persisted `player.voiceCues` preference (schema v10 + migration, default
  **on**) toggled next to Auto-mark on the play screen and, for focus-only
  strength workouts that never reach play mode, on the focus screen too;
  `speak()` no-ops where speechSynthesis is unavailable, and beeps/vibration
  are unchanged.

## 1.E25.U139 (package 1.25.139) — 2026-07-14

- **E25 — Body-trend continuity, composition units & motivation-first dashboard.**
  Trend lines no longer break on days without a weigh-in: `fillForward`
  (U138) carries the last measurement across gaps as flagged `filled` points,
  so the metric chart and the composition chart draw one unbroken line while
  markers and the crosshair still snap only to real logged days. The
  carried-forward (assumed) spans render **dashed and faded** so a flat
  "same as last weigh-in" stretch never reads as observed data, with a
  "┈ assumed (no weigh-in)" legend note; the 7-day trend is averaged from
  the real samples only, so carried-forward copies never drag it. The
  body-composition chart gains a unit toggle (U137) between absolute mass
  (kg/lb) and percent of body weight — lean % derives as 100 − BF %, so it
  works even on weigh-ins without a weight reading, and the chart defaults to
  whichever mode actually has data. The daily-motivation quote card moves to
  the top of the Dashboard (U139), the first widget below the title.

## 1.E24.U136 (package 1.24.136) — 2026-07-13

- **E24 — Recomposition-aware targets & low-carb diet style.** The target-based
  layer now honors _all_ the stored body targets instead of collapsing them
  into one scale-weight number. `targetComposition` resolves lean-mass
  increase, body-fat % and FFMI targets (any one is enough — previously the
  layer needed every input and ignored FFMI entirely) into a target lean/fat
  pair anchored to the latest weigh-in, and the energy budget prices each
  delta at its own tissue density (adipose ~7700, lean ~1800 kcal/kg — netting
  both at 7700 understated a recomp's deficit by the planned lean gain). A
  fat-loss-plus-lean-gain target now reads as a **Recomp** goal with protein
  held at 2.2 g/kg and both weekly paces shown, each clamped to its own
  muscle-sparing band. New **Diet style** setting
  (`settings.nutrition.dietStyle`, schema v9 + migration): _Low-carb_ caps the
  carb fill at the <130 g/day consensus threshold and moves the spare
  calories into fat; calories and protein are unchanged. Sources added to
  `docs/requirements/nutrition-targets.md` (Hall 2008, Barakat 2020, Feinman
  2015). The workbook's own quirky `targetWeight` formula is untouched — it
  still anchors the body-chart color scales (rule 1) but no longer leaks into
  the evidence-based layer.

## 1.E23.U135.B00 (package 1.23.135) — 2026-07-12

- **E23 — Workout media deeplinks**: each routine can carry a personal video
  and/or audio link, entered in the new **Workout links** card in Settings
  (`settings.workoutLinks`, schema v8, v7→v8 migration). Configured links
  surface as Video/Audio launch buttons on the Today/day workout cards and the
  workout detail header, opening the session media in a new tab
  (`noopener noreferrer`). Only absolute http(s) URLs are accepted — the
  schema, the input parser and the store action all reject
  `javascript:`/`data:`/relative input, so a pasted link can never inject
  script; invalid input is flagged inline and never stored, and blanking a
  field removes the link and its buttons.

## 1.E22.U132 (package 1.22.132) — 2026-07-12

- **E22 — Nutrition targets.** The app now tells you how many calories and
  which macro split to aim for. A pure engine (`src/lib/nutrition.ts`) encodes
  the published P90X Nutrition Plan guide verbatim — RMR = weight (lb) × 10,
  - 20% daily activity, + 600 kcal workout → energy amount → level chart
    (I/II/III = 1800/2400/3000 kcal), split into protein/carb/fat grams by the
    day's nutrition phase (Fat Shredder 50/30/20, Energy Booster 40/40/20,
    Endurance Maximizer 20/60/20). The workbook's nutrition tabs were excluded
    from the port, so the guide — not the sheet — is the oracle here, sourced in
    `docs/requirements/nutrition-targets.md`. Today/day pages get a **Nutrition**
    card showing the day's kcal and macro grams, following the materialized day's
    training phase so skips/remaps move the nutrition phase with the workouts.
    Settings gains a **Nutrition** section: derived energy amount / level / daily
    target (from the latest weigh-in, start weight as fallback), a phase override
    (Auto follows the training blocks), a custom daily-calorie override, and the
    three-phase split table. New `settings.nutrition` (schema v7, v6→v7
    migration); every target number stays derived (rule 2).
- **Evidence-based target layer.** Because the boxed guide is goal-blind,
  each surface also shows a **target-based** recommendation next to the program
  numbers: calories from an estimated TDEE (Katch–McArdle when lean mass is
  known, else Mifflin–St Jeor; ×1.55) plus the surplus/deficit needed to reach
  the stored target weight over the remaining program window (~7700 kcal/kg),
  clamped to muscle-sparing rate bands (Helms ≤1%/wk loss, ~0.5%/wk usable
  gain) and floored at BMR; protein 1.6–2.2 g/kg (raised in a deficit), fat
  0.8 g/kg (0.5 floor), carbs as the remainder. Reuses E20's horizon; tier-
  labelled and sourced in `docs/requirements/nutrition-targets.md`. Not medical
  advice.

## 1.E21.U129.B00 (package 1.21.129) — 2026-07-12

- **E21 — Charting upgrades.** The hand-rolled SVG charts get a crosshair
  read-out (hover/tap snaps to the nearest logged point and prints each
  series' value + date), point markers (which also make isolated entries
  between gaps visible), program-phase shading, and a dashed moving-average
  trend overlay. New charts: **Body composition** (lean mass vs fat mass —
  recomp made visible) on Body trends, **Session total** (whole-workout net
  score per session with a 3-session trend) on Strength progression, and a
  cumulative **Adherence trend** line on the dashboard's Adherence & pace
  card. All chart math stays in pure `src/lib` functions (`movingAverage`,
  `nearestX`, `adherenceTrend`, `workoutTotalTrend`) with unit tests.

## 1.E20.U128.B03 (package 1.20.128-b3) — 2026-07-12

- **Bug fix**: the grid view's round row (main reps field + secondary field,
  e.g. knee reps) didn't wrap on narrower phones, so the secondary field's
  +/− buttons rendered outside the card frame instead of stacking below the
  main field. `RoundInputs` row now wraps.

## 1.E20.U128.B02 (package 1.20.128) — 2026-07-12

- **Bug fix** (PR #34): the rest timer's custom-seconds field couldn't take
  multi-digit values (45, 100, 120, 300...); fixed three related races in the
  cloud-sync engine (an after-reset safety pause cleared before its
  restore/upload finished, an in-flight pull silently discarding a concurrent
  local edit, a debounced push dropped mid-cycle), plus a follow-up for a
  conflict the pause fix itself left behind.

## 1.E20.U128.B01 (package 1.20.128) — 2026-07-12

- **Bug fix** (PR #33): the Reality check panel paced fat-loss verdicts off
  fat-mass lost instead of scale-weight lost, wrongly flagging sound recomp
  plans as unrealistic — now paces against actual weight change and explains
  recomp cases. Also fixed a hard-coded "kg" unit ignoring the units setting,
  and Row crushing labels into an unreadable one-word-per-line column next to
  wide controls on mobile.

## 1.E20.U128 (package 1.20.128) — 2026-07-11

- **E20 — FFMI target feasibility** (PR #<N>): the estimator now rubs the target
  against reality — remaining-horizon fat-loss and muscle-gain pace verdicts
  (fat-loss first) from two published rate models shown side by side, a recomp
  flag, an approximate natural-FFMI ceiling, and a suggested achievable target,
  plus an on-pace chip on the dashboard FFMI tile. New `settings.training`
  (schema v6). Evidence-tiered and cited in `docs/requirements/ffmi-feasibility.md`;
  gain-rate models are practitioner heuristics, not RCTs — labelled as such.

## 1.E19.U121 (package 1.19.121) — 2026-07-11

- **E19 — Yoga play variants** (PR #<N>): Yoga X days play the classic timeline
  (transcript-faithful, truncated where the transcript ends) or the P90X3
  30-minute timeline — persisted preference in Settings (schema v5) with a
  per-launch override on the play screen.

## 1.E18.U118 (package 1.18.118) — 2026-07-11

- **E18 — X Stretch + Cardio X play** (PR #<N>): both workouts join play mode as
  data-only timelines — timed holds, Done-to-advance flows and rep drills;
  Cardio X logs its 12 drills done/skipped. No engine or schema changes.

## 1.E17.U115 (package 1.17.115) — 2026-07-11

- **E17 — Kenpo X play** (PR #<N>): 93-segment Kenpo timeline — timed stretch/
  cardio intervals count down; rep drills wait for a Done tap and log done/
  skipped per drill. Engine gains untimed-wait support; strength play unchanged.

## 1.E16.U112 (package 1.16.112) — 2026-07-11

- **E16 — Plyometrics play** (PR #<N>): “Play workout” runs the full Plyo video
  timeline — 76 segments (flattened splits, water breaks), authored 5s get-ready
  gaps, beep at every switch, per-jump done/skipped log (schema v4), optional
  auto-mark-done setting. Playback engine generalized; strength focus play
  unchanged. Versioning convention now `1.E{epic}.U{story}` (supersedes E13's
  minor/patch rule).

## 1.5.1 — 2026-07-11

- **E15 — Playwright test device replacement & UI validation** (PR #26): Replace emulated test
  device Pixel 7 with custom realme 16 Pro+ profile (RMX5131 specs), ensuring Playwright
  also verifies UI issues visible in screens for both desktop and the specific mobile device.
  - _Hardening pass (same PR):_ per-platform visual baselines (`-win32` committed from the dev
    machine, `-linux` from CI) so the diff threshold could tighten from 15% to **1%**; full-page
    captures instead of viewport-only; deterministic timer states (`clock.fastForward`) and a
    pinned timezone; soft, stepped assertions so all 31 comparisons run and report.

## 1.5.0 — 2026-07-11

- **E14 — FFMI target estimator** (PR #<N>): Settings → Targets & limits can now
  derive your targets from a normalized-FFMI goal (workbook 6.1 normalization) —
  implied lean mass, lean gain and weight shown live, applied behind a confirm as
  the honest lean-mass increase + target body-fat + a stored FFMI target
  (schema v3) that the dashboard KPI and trends track.

## 1.4.0 — 2026-07-11

- **E12 — Focus play timer** (PR #24): press Play and focus mode runs itself —
  work slot per step (default 60 s, adjustable), cue, rest at your configured
  duration with inputs still on the step you just did, auto-advance to the end.
  Pause / resume, +10 s, skip. Durations persist (schema v2 with a stepwise
  migration pipeline; old exports and the v1 sample import cleanly).

## 1.3.0 — 2026-07-11

- **E11 — Chest & Back focus sequence** (PR #23): focus mode plays Chest & Back
  as 24 single-round steps — round 1 in sheet order, round 2 with each push/pull
  pair swapped, matching the video. Grid, storage and scoring unchanged.

## 1.2.0 — 2026-07-10

- **E10 — Cloud sync** (PR #21): opt-in, end-to-end-encrypted cross-device sync
  against a self-hosted Cloudflare Worker + KV. D3 amended to "local-only by
  default; cloud strictly opt-in".
- Docs refresh chore (PR #19).

## 1.1.0 — 2026-07-10

- **E9 — Fresh-start onboarding** (PR #18): the `/start` route — begin a program
  by picking a date, no import needed.

## 1.0.0 — 2026-07-09

- **E0–E8 — the full v1.0.0 PRD scope** (PRs #8–#17): schedule + reschedule
  engine, workout logging with workbook-exact scoring, body log and derived
  metrics, dashboard / trends / strength progression, quotes, settings and
  body-fat calculators, hardening & release (error boundaries, a11y sweep,
  Lighthouse gates).

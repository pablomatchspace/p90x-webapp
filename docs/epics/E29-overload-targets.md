# Epic E29 — Progressive-overload targets in focus mode

> **Status:** delivered · **Stories:** US-147 → US-149
> **Ships as:** package **1.29.149**, displayed **`1.E29.U147`**…`U149` (final `1.E29.U149`) · **Schema:** unchanged (v11)
> **One-liner:** Focus mode stops being a recorder and starts coaching: each
> exercise card shows a forward-looking **target — beat your last net score** —
> that tints live as you enter reps, falls back to the **last archived round**
> when this round has no history yet (E28 synergy), and the finish summary
> counts targets beaten.

---

## 1. Problem

Focus mode shows the past (ghost prefill, history sparkline) and judges the
past (PRs at finish), but never states the goal *before* the set. The number
to chase — "last time you netted 24.5" — exists in the scoring engine yet is
never surfaced when it matters: with sweaty hands, mid-set, deciding whether
to squeeze out one more rep. And on day 1 of a new round there is no
this-round history at all, even though E28 archives hold exactly the numbers
worth beating.

## 2. Goals

1. **A concrete target per exercise, visible before and during entry** — the
   latest earlier net score (score − penalty, the DATA-sheet metric every
   chart already uses), with live beaten/behind feedback as values land.
2. **Round-2 continuity** — no this-round history ⇒ the target comes from the
   newest archived round that logged the exercise, computed with that round's
   frozen scoring snapshot (never rewritten by later Settings changes).
3. **A finish-summary tally** — "Targets beaten: X of Y" alongside the
   existing PR line (PR = beats *all* history; target = beats *last time* —
   both statements are useful and distinct).

## 3. Non-goals

- Prescriptive rep/weight programming (e.g. "+2.5 kg this week") — the app
  states the number to beat; how to beat it stays the athlete's call.
- Grid-view chips — the grid is a review surface; coaching belongs to focus
  mode (the workout-time surface). Revisit on demand.
- Storing anything: targets are pure derivations (rule 2).

## 4. Design

`src/lib/overload.ts` (pure):

- `overloadTarget(occurrences, sessions, occIndex, exercise, scoring, archiveNets?)`
  → `{ net, source: 'round' | 'archive', week }` — walks back through this
  round's earlier occurrences for the latest logged net (same walk the ghost
  prefill uses, so a skipped week doesn't blank the target); falls back to
  `archiveNets`; `null` when no history exists anywhere.
- `archiveLatestNets(rounds, workoutKey)` → `Map<exerciseId, net>` from the
  **newest** archived round with any logged net for the workout, scored with
  the archive's own `snapshot.scoring` (historically true numbers).
- `targetStatus(currentNet, target)` → `'pending' | 'beaten' | 'matched' | 'behind'`.

Focus mode (US-148): a target line under the exercise heading —
`Target: beat 24.5 (last time, W2)` or `(last round)` — zinc while pending,
emerald when beaten, amber when matched/behind. The finish card gains
`Targets beaten: X of Y` (hidden when no exercise has a target).

## 5. Stories

### US-147 — Pure overload-target engine (M, P0)

**AC:** [x] target = latest earlier logged net in this round, skipping
unlogged occurrences · [x] archive fallback uses, per exercise, the newest
archived round that logged it, with the owning round's frozen scoring params ·
[x] null with no history anywhere ·
[x] status covers pending/beaten/matched/behind.

### US-148 — Focus-mode target chip & summary tally (M, P0)

**AC:** [x] chip renders only when a target exists · [x] tint follows live
entry (aria-live text, no layout shift) · [x] source labelled last time (week)
vs last round · [x] finish summary counts beaten targets over exercises with
targets.

### US-149 — E2E, baselines & release (S, P1)

**AC:** [x] e2e: sample import → focus on a later occurrence → target chip
visible → beating entry flips it · [x] linux visual baselines regenerated
(focus shots gain the chip) · [x] version/CHANGELOG/docs.

## 6. QA

Unit: history walk with gaps, archive fallback ordering (newest wins),
differing archive scoring params, empty everything. E2E as above. Edge rows:
exercise with 4 rounds (Strip-Set Curls), R×W rows, ARX (sum agg), first
occurrence of round 1 (no chip), archived round without this workout.

## 7. Out of scope / follow-ups

Voice-cue integration ("target twenty-four and a half") — natural E26 tie-in
once the chip proves useful; grid-view surfacing; suggested increments.

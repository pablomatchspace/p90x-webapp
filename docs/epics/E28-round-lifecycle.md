# Epic E28 — Round lifecycle: archive, end-of-round report & round-over-round comparison

> **Status:** delivered · **Stories:** US-143 → US-146
> **Ships as:** package **1.28.146**, displayed **`1.E28.U146`** · **Schema:** v10 → **v11**
> **One-liner:** A 90-day round can now **end**: complete-and-archive freezes the
> round inside the document, a report screen turns day 90 into a deliverable
> (body deltas vs targets, adherence, top movers), and the next round starts
> clean while every chart can overlay "this round vs last round".

---

## 1. Problem

The document holds exactly one program (`settings.startDate` non-null ⇒ a
program exists) and `startProgram` refuses to overwrite. On day 90 the only
options were to keep a finished program forever or export-and-reset — which
severs the history from the live app. There was also no moment of payoff: the
program just… continues past its last day. And round 2 could never answer the
question that makes a second round worth doing: *am I ahead of last time?*

## 2. Goals

1. **Complete a round without losing it** — one flow that archives the round
   inside the same document (export/import/sync carry it automatically) and
   resets the app for a fresh start.
2. **An end-of-round report** — start vs final body metrics against the SETUP
   targets, adherence totals, and per-exercise/per-workout strength deltas;
   available mid-round as "report so far", and forever for archived rounds.
3. **Round-over-round comparison** — body trends by program day and workout
   net totals by occurrence, this round overlaid on any archived round.
4. **Reversible** — an archive can be restored to live (while no live program
   exists), renamed, or deleted; nothing is ever silently discarded.

## 3. Non-goals

- Cross-round **aggregation** (lifetime totals, all-time PRs) — comparison is
  pairwise, one archived round at a time.
- Multiple **concurrent** programs — exactly one live round at a time, as ever.
- Automatic archiving on day 90 — completing a round is always an explicit,
  guarded user action (the app never mutates data by itself).
- Other P90X variants (deferred separately).

## 4. Design

### Data model (v11)

New top-level `rounds: ArchivedRound[]`. An archived round is a **raw-input
snapshot** — the same shape the live round keeps, plus the round-scoped
settings frozen at archive time:

```jsonc
{
  "id": "r-…",
  "archivedAt": "2026-07-15T…Z",
  "label": "Round 1", // user-editable
  "program": "classic",
  "startDate": "2026-01-05",
  "scheduleOps": [], // as live
  "workoutLogs": {}, // as live
  "bodyLog": [], // as live
  "snapshot": {
    // the round-scoped settings a report needs to recompute the round
    // exactly as it was: scoring params drive the engine, height/start
    // stats drive body derivations, targets/limits drive the KPI reads.
    "age": 40,
    "height": 1.8,
    "startWeight": 82,
    "startBodyFat": 0.22,
    "limits": { "weight": 90, "bodyFat": 0.25, "bmi": 28 },
    "targets": { "leanMassIncrease": 4, "bodyFat": 0.15, "ffmi": null },
    "scoring": { "penaltyDivisor": 2, "penaltyOn": true, "chairFactor": 2, "rwDivisor": 10 }
  }
}
```

Rule 2 holds: nothing derived is stored. The snapshot copies **raw inputs**
that would otherwise mutate under the next round's settings; every score,
BMI, FFMI and adherence number for an archived round is still recomputed by
the same pure functions, fed from the frozen inputs. Migration v10→v11
backfills `rounds: []`.

### Actions (`src/state/actions.ts`)

- `completeRound(options)` — archives the live round (label defaults to
  "Round N"), then resets the round-scoped state: `startDate → null`,
  `scheduleOps/workoutLogs/bodyLog → empty`. Global preferences survive
  (units, gender, timer, player, yoga, nutrition, links, quotes, notes) and
  so do the SETUP stats — with `seedFromLatest: true` (UI default when a
  weigh-in exists) `startWeight`/`startBodyFat` are first re-seeded from the
  round's **latest weigh-in**: an explicit raw→raw copy the user opts into,
  mirroring the calculators' "use as starting BF%" precedent.
- `restoreRound(id)` — moves an archive back to live (refused while a live
  program exists, same guard philosophy as `startProgram`); the snapshot is
  written back to settings so the round comes back exactly as archived.
- `renameRound(id, label)` / `deleteRound(id)` — list hygiene; delete is
  confirm-guarded in the UI.

### Report (`src/lib/roundReport.ts`, pure)

`buildRoundReport(round, today)` where `round` is the normalized
`RoundData` (live state and archives both map onto it). For an archived
round `today` is the schedule's `projectedCompletion`, so every day has been
decided (nothing "pending"); a live round uses the real today ("report so
far"). Contents:

- **Adherence** — reuses `computeAdherence` verbatim (same status rules as
  the calendar, US-047).
- **Body outcome** — first vs latest weigh-in per metric (weight, BF%, BMI,
  lean mass, FFMI) via `deriveBody` on the snapshot inputs, with delta and
  target/limit reads.
- **Strength outcome** — per strength/ARX workout: first vs latest session
  net total (`sessionTotals`), plus a cross-workout **top movers** ranking
  from `workoutProgression`'s per-exercise first/latest deltas.

### Comparison (`src/lib/roundCompare.ts`, pure — US-146)

Pairwise, current report's round vs one archived round:

- **Body overlay** — a metric's value by **program day number** (day of the
  weigh-in date within its own round), so calendar dates don't matter.
- **Strength overlay** — a workout's session net total by **occurrence
  index** (1st…13th time the workout came up), tolerant of reschedules.
- **Adherence side-by-side** — the two reports' headline numbers.

### UI

- **More → Rounds** (`/rounds`): live-round card (day X/90 + "view report" +
  the guarded complete-and-archive flow with the seed option and an
  export-first nudge) and the archive list (label, dates, program, report
  link, restore/rename/delete).
- **Report** (`/rounds/live` and `/rounds/:id`): one shared view for live and
  archived rounds; comparison section appears when another round exists,
  with a picker when there are several.
- **Dashboard**: when the live round has reached its last program day, a
  "Round complete" card links to the report/archive flow.
- **Start**: unchanged — after archiving, the existing `/start` screen begins
  round 2 (its "program already running" guard keeps working).

## 5. Stories

### US-143 — Round archive schema & actions (M, P0)

Schema v11 (`rounds`, `ArchivedRound`, migration), `completeRound` /
`restoreRound` / `renameRound` / `deleteRound`.

**AC:** [x] migration backfills `rounds: []` and old exports import cleanly ·
[x] archive→restore is identity for the round-scoped state (test) ·
[x] `completeRound` is a no-op without a live program; `restoreRound` refuses
while one exists · [x] seed option copies the latest weigh-in's
weight/BF% into SETUP start stats · [x] export/import round-trips archives.

### US-144 — End-of-round report (L, P0)

`roundReport.ts` + shared report view + `/rounds/live` & `/rounds/:id`
routes + dashboard round-complete card.

**AC:** [x] adherence numbers equal the dashboard's for the live round ·
[x] body deltas derive from the snapshot (archived) / settings (live) ·
[x] top movers match the progression engine's first/latest deltas ·
[x] archived-round report treats undone past days as missed, none pending ·
[x] dashboard card appears once the last program day is reached.

### US-145 — Rounds page & complete-round flow (M, P0)

More-hub card + `/rounds` screen with the archive flow and list actions.

**AC:** [x] archive flow confirms, offers the seed toggle, nudges export ·
[x] after archiving the app is in the clean no-program state and `/start`
works · [x] restore/rename/delete behave per US-143 guards · [x] archives
render label, date range, program and open their report.

### US-146 — Round-over-round comparison (L, P1)

`roundCompare.ts` + comparison section on the report view.

**AC:** [x] body overlay aligns by program day, strength overlay by
occurrence index · [x] section hidden with no other round; picker with
several · [x] comparison series render dashed/muted vs the current round ·
[x] adherence side-by-side shows both rounds' headline stats.

## 6. QA

Unit: migration, archive/restore identity, report vs adherence/progression
golden agreement, compare alignment (different start dates, reschedules,
sparse logs). E2E (`e2e/rounds.spec.ts`): sample import → live report →
archive (seeded) → clean start state → round listed → report + restore.
Edge rows: archive with zero weigh-ins (seed disabled), archive mid-round,
restore after starting a new round (refused), delete confirm, imports from
schema ≤v10.

## 7. Out of scope / follow-ups

Cross-round aggregates and PR detection against archived rounds (a natural
E-later once ghosts can read archives); auto-suggesting archive on day 90+N.

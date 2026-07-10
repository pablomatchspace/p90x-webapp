# PRD — p90x-webapp

> **Sanitized copy for the public repo (PRD decision D3).** The owner's real
> setup figures, body-log values, logged scores and real program dates have been
> replaced with the repo's fabricated **sample dataset** values (start
> `2026-01-05`, 1.8 m / 82 kg / 22 % BF, etc.) or generalized. Nothing here is
> real personal data. The working PRD lives outside the repo.

**Product:** P90X companion web app replacing the `P90X Classic 05_2026_Codex.xlsm` workbook (P90Xcel v2.05)
**Repo:** `p90x-webapp` — public GitHub repository
**Author:** Claude (Fable 5) with the owner — PRD confirmed via structured Q&A on 2026-07-06
**Status:** delivered — this document is the **v1.0.0 scope** (E0–E8). Epics after
v1.0.0 are specified in [`docs/epics/`](epics/); see §9.

---

## 1. Problem statement

The owner is part-way through a 90-day P90X Classic round and tracks everything in a 52-sheet Excel workbook. The workbook works but is painful on mobile during workouts, rescheduling requires unprotecting sheets and running VBA macros, the dashboard/chart experience is dated, and data entry is slow. The cost of not solving it: friction reduces logging fidelity and adherence for the rest of the round and any future rounds.

The app is a **single-user, fully client-side, mobile-first PWA** that replicates the workbook's proven data model and scoring engine, adds first-class rescheduling, a real dashboard, motivational quotes, and fast workout entry — with existing Excel data imported from a local file (never bundled, never auto-loaded).

## 2. Goals

1. **Full data continuity** — 100% of the values entered in the workbook (workout logs, body log, setup, notes, skips) import losslessly via a converter + import flow; computed scores match Excel within ±0.01 (golden-master tests).
2. **Faster logging** — a strength session can be logged in ≤90 seconds using prefill/steppers/focus mode (vs. multi-minute Excel grid on desktop only).
3. **Rescheduling as a first-class feature** — all four modes (skip/shift, move/swap, pull-forward, weekly template remap) with preview, undo, and integrity guarantees; no macro/unprotect ritual.
4. **Decision-grade dashboard** — actuals vs. starting metrics and targets (body), adherence/pace, strength progression, and phase/next-workout status visible at a glance.
5. **Zero-maintenance operation** — static site on GitHub Pages, offline-capable PWA, no backend, no accounts, no personal data in the public repo.

## 3. Non-goals (explicitly out of scope)

| Non-goal                                               | Why                                                                                                                                                            |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fit Test module                                        | Excluded by owner                                                                                                                                              |
| Nutrition (setup, portion plan, calories, WEEK n CALs) | Excluded by owner                                                                                                                                              |
| MEASUREMENTS sheet (tape-girth grid, day 1/30/60/90)   | Excluded by owner. **Note:** the _daily scale log_ (weight/BF%/water/bone inside SCHEDULE) is IN scope — it powers the dashboard                               |
| Print sheets                                           | Excluded by owner                                                                                                                                              |
| Multi-user, auth, cloud sync, backend                  | Single-user personal tool; static hosting only                                                                                                                 |
| Native mobile apps                                     | PWA covers the need                                                                                                                                            |
| P90X **Doubles** variant                               | Not supported by the source workbook either (Classic/Lean only; a "Doubles" label remnant exists in one formula but no template)                               |
| Heart-rate "Time in Zone" analytics                    | Column exists in workbook but unused and its % formula is broken (divides by a text cell). Raw minutes field is preserved (P1); analytics deferred (P2)        |
| Beachbody/P90X branding assets                         | Copyright (workbook carries a 2009 Product Partners LLC notice). Exercise names/schedule as factual data only; no logos/branding; personal, non-commercial use |

## 4. Users & context

Single persona: **the athlete-owner** — metric units, digital-scale user, mid-program. Uses a **phone during workouts** (sweaty hands, quick entries) and a **desktop/laptop for review** (charts, schedule surgery). Runs Classic; wants Lean available as a toggle.

## 5. Locked product decisions (from PRD Q&A, 2026-07-06)

| #   | Decision           | Choice                                                                                                                                 |
| --- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Stack              | **Vite + React + TypeScript**, client-side only, GitHub Pages                                                                          |
| D2  | Rescheduling scope | **All four modes**: skip/shift-remaining, move/swap single days, pull-forward, weekly template editor                                  |
| D3  | Personal data      | **Local import file only** — converter output is gitignored; public repo ships a fabricated sample dataset for demos/tests only        |
| D4  | Dashboard          | All KPI groups: body metrics vs targets **plus body progress charts**, adherence & pace, strength progression, phase/next-workout card |
| D5  | Quotes             | Built-in offline pack + **editable** in Settings (stored in user data); deterministic quote-of-the-day                                 |
| D6  | Entry UX           | **All**: last-time ghost prefill, steppers/numeric keypad, focus mode, rest/interval timer                                             |
| D7  | Platform           | **Mobile-first + installable offline PWA**                                                                                             |
| D8  | Extras             | **All in**: free-form notes page, Lean-variant toggle, body-fat calculators (Navy/3-site/7-site)                                       |

Supporting defaults: Tailwind CSS for styling; Zustand for state; hand-rolled SVG for charts (no chart library); Zod for import validation; `vite-plugin-pwa` for the service worker; dates handled as local-calendar ISO strings (`YYYY-MM-DD`, no UTC conversion); light/dark theme via system preference.

## 6. Source-of-truth analysis (workbook inventory → disposition)

Decoded from `P90X Classic 05_2026_Codex.xlsm` (P90Xcel v2.05, workoutsoft.com):

### 6.1 Sheet disposition

| Workbook area                                                                                                                                          | Contents                                                                                                                                                                                                                                                                                                                                              | App disposition                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| MAIN                                                                                                                                                   | Hyperlink navigation hub                                                                                                                                                                                                                                                                                                                              | → App navigation                                                |
| INSTRUCTIONS                                                                                                                                           | Usage guide, abbreviations (R/W, NC/C, N/K, RA/LA, RL/LL), changelog                                                                                                                                                                                                                                                                                  | → Help/About page (abbreviations legend)                        |
| YOUR NOTES                                                                                                                                             | Free-form notes (currently empty)                                                                                                                                                                                                                                                                                                                     | → Notes page (D8)                                               |
| SETUP                                                                                                                                                  | Program variant (Classic/Lean), start date, units (inch/lb, meter/kg), gender, BF method, start stats (age/height/weight/BF% → LBM, FBM, BSA, BMI), upper limits (weight/BF/BMI), targets (LBM increase, target BF% → target weight/BMI), scoring params (penalty divisor + on/off, chair-assist factor, R×W display divisor)                         | → Settings screen + scoring engine config                       |
| CALCULATORS                                                                                                                                            | BF% via scale / US Navy / 3-site / 7-site skinfold (male/female formulas)                                                                                                                                                                                                                                                                             | → Calculators screen (D8)                                       |
| FIT TEST                                                                                                                                               | Fit test grid                                                                                                                                                                                                                                                                                                                                         | **OUT**                                                         |
| MEASUREMENTS                                                                                                                                           | Tape-girth grid                                                                                                                                                                                                                                                                                                                                       | **OUT**                                                         |
| SCHEDULE                                                                                                                                               | Day-per-row program: date, workout (col N, hyperlinked to log sheets), phase markers (rows for Phase 1/2/3); **daily scale log** (weight, BF%, water %, bone %; derived: weight loss, BF kg, BMI, lean mass, FFMI + category); reschedule target for the VBA skip macro; skipped days appear as blank workout rows (3 present in the source workbook) | → Schedule/calendar + Today view + Body log + Reschedule engine |
| Strength sheets ×7: CHEST & BACK, SHOULDERS & ARMS, LEGS & BACK, CORE SYNERGISTICS, CORE SYNERGISTICS (LEAN), CHEST SHOULDERS & TRICEPS, BACK & BICEPS | Week-block columns (5 cols/block; dates pulled live from SCHEDULE so reschedules shift them); per exercise ×2 rounds: reps + assisted-variant reps (N/K knees, NC/C chair) or reps×weight; per-arm/leg rows where applicable; computed score + penalty; editable week-header annotations (e.g. "2 with chestweight"); notes area                      | → Workout log screens + scoring engine                          |
| AB RIPPER X                                                                                                                                            | 11 exercises × 3 sessions/week × weeks, reps grid                                                                                                                                                                                                                                                                                                     | → Ab Ripper log screen                                          |
| Cardio-style ×4: PLYOMETRICS, CARDIO X, YOGA X, KENPO X                                                                                                | Per session: COMPLETED? (NOT YET / YES / NO) + free-text notes                                                                                                                                                                                                                                                                                        | → Completion-style log screens                                  |
| DATA                                                                                                                                                   | Chart engine: per exercise/week **net score = score − penalty**, `NA()` gaps, per-exercise boolean toggles (driven by Check/Uncheck-all macros)                                                                                                                                                                                                       | → Analytics selectors (pure TS)                                 |
| 7 CHART sheets                                                                                                                                         | Excel charts of DATA series with toggles                                                                                                                                                                                                                                                                                                              | → Dashboard/Progress charts                                     |
| NUTRITION SETUP, PORTION PLAN, CALORIES CHART, WEEK 1–13 CALs                                                                                          | Nutrition tracking                                                                                                                                                                                                                                                                                                                                    | **OUT**                                                         |
| 8 "for Print" sheets                                                                                                                                   | Printable blank logs                                                                                                                                                                                                                                                                                                                                  | **OUT**                                                         |

### 6.2 VBA feature disposition

| Macro                                  | Behavior                                                                                                      | App disposition                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `SkipDayRelative`                      | Insert blank day at selected SCHEDULE row (shifts N:Q down); remaining workouts move +1 day; end date extends | → Reschedule: skip/shift (US-030)  |
| `UndoSkipDayRelative`                  | Delete inserted blank                                                                                         | → Undo / pull-forward (US-031)     |
| `ClearSheet`                           | Clear all unlocked (user-entered) cells                                                                       | → Reset-all-data (US-013)          |
| `CheckAll` / `UncheckAll`              | Toggle all chart series checkboxes                                                                            | → Chart series all-on/off (US-063) |
| `SelectUnlockedCells`, `ChangeFormula` | Excel-internal utilities                                                                                      | N/A                                |
| `AddPortion`                           | Nutrition rows                                                                                                | **OUT**                            |

### 6.3 Scoring engine (exact rules to replicate)

Let `chairFactor` = SETUP!C47 (=2), `penaltyOn` = SETUP!C45 (=1), `penaltyDiv` = SETUP!C44 (=2), `rwDiv` = SETUP!C49 (=10).

- **Rep exercises with assisted variant** (N/K push-ups, NC/C pull-ups): adjusted reps per round = `main + assisted/chairFactor`. Score = `AVERAGE(adj₁, adj₂)`. Penalty = `0` if round2 ≥ round1, else `penaltyOn × (round1 − round2)/penaltyDiv`.
- **Weighted exercises** (R×W): score = `AVERAGE(r₁×w₁, r₂×w₂)/rwDiv`; penalty analogous, in the same /rwDiv scale.
- **Chart metric** (DATA sheet): `net = score − penalty` per exercise per week; missing weeks = gaps; per-exercise visibility toggle.
- **Body derivations** (per body-log entry): BF kg = `weight × bf%`; BMI = `weight/height²` (×703 for inch/lb); lean mass = `weight × (1 − bf%)`; FFMI = `leanMass/height² + 6.1 × (1.8 − height)`; FFMI category bands exactly as in the workbook formula; weight loss = `startWeight − weight`.
- **Settings derivations**: LBM/FBM/BSA/BMI at start; target weight = `(targetLBMIncrease + startLBM) + startLBM × targetBF%` (workbook formula, incl. its "CHECK VALUES!" guard); planned completion = `start + 90 days`; projected completion = date of last scheduled program day.

### 6.4 Known workbook defects — intentionally NOT replicated

| #   | Defect in Excel                                                                                                            | App behavior                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | Time-in-Zone % formula divides minutes by a **text** category cell → `#VALUE!`                                             | Raw minutes stored (P1); no broken % column                                                                                                            |
| B2  | Weight-loss column shows start weight on days with no weigh-in                                                             | No derived values rendered for empty entries                                                                                                           |
| B3  | Penalty formula inconsistency: week-1 columns compare rounds including assisted reps; several later-week columns omit them | **Canonical rule:** always compare _adjusted_ round totals (main + assisted/chairFactor). Deviation documented; golden tests assert the canonical rule |
| B4  | Typos: "X Strech", "Lawnmovers"                                                                                            | Corrected display names; converter maps by cell position, not name                                                                                     |

## 7. Information architecture

Six primary tabs (bottom bar on mobile, sidebar on desktop):

```
Dashboard  |  Today  |  Schedule  |  Workouts  |  Body  |  More
```

- **Dashboard** — phase/next-workout card, quote of the day, KPI cards (body vs targets, adherence), trend + progression charts.
- **Today** — date, scheduled workout(s) incl. Ab Ripper pairing, quick log/mark-done, reschedule entry point.
- **Schedule** — 13-week calendar (mobile: week strip; desktop: grid), status colors, phase bands, reschedule actions, history/audit.
- **Workouts** — index of the 12 log sheets → grid view + focus mode.
- **Body** — daily scale log list + entry form, target/limit color coding.
- **More** — a hub of seven pages: **Data** (import / export / sample / reset), **Rest timer**, **Motivation** (quote pack editor), **Settings** (every SETUP field + units + scoring params), **Notes**, **Body-fat calculators**, **Help & About**.

Reachable but off the tab bar: **`/start`** (the no-import onboarding screen — see
[`docs/epics/E9-fresh-start-onboarding.md`](epics/E9-fresh-start-onboarding.md)),
day detail, weekly editor, reschedule history, workout detail, focus mode, and
the two chart pages (`/trends`, `/progress`). Every screen that needs a program
falls back to a shared empty state offering **Start a program** or **Import your
data**.

## 8. Data model (summary)

Single versioned JSON document, persisted to `localStorage`, identical shape for import/export. Values below are the **fabricated sample** (no real data):

```jsonc
{
  "schemaVersion": 1,
  "settings": {
    "program": "classic",
    "startDate": "2026-01-05",
    "units": "metric",
    "gender": "male",
    "age": 40,
    "height": 1.8,
    "startWeight": 82,
    "startBodyFat": 0.22,
    "limits": { "weight": 90, "bodyFat": 0.25, "bmi": 28 },
    "targets": { "leanMassIncrease": 4, "bodyFat": 0.15 },
    "scoring": { "penaltyDivisor": 2, "penaltyOn": true, "chairFactor": 2, "rwDivisor": 10 },
  },
  "scheduleOps": [
    // every op carries `id` + `createdAt`; a reverted op keeps `revertedAt` and
    // stays in the list for the audit trail, but stops applying
    {
      "kind": "skip",
      "id": "...",
      "createdAt": "...",
      "date": "2026-01-14",
    } /* + swap / remap ops */,
  ],
  "workoutLogs": {
    "chest-back": {
      "sessions": [
        {
          "programDayId": "d001",
          "annotation": "",
          "entries": {
            "standard-push-ups": {
              "rounds": [
                { "main": 8, "secondary": 0 },
                { "main": 6, "secondary": 2 },
              ],
            },
          },
          "completed": true,
          "notes": "",
        },
      ],
    } /* …per workout type; cardio-style: status + notes; ARX: reps per exercise */,
  },
  "bodyLog": [
    {
      "date": "2026-01-06",
      "weight": 82,
      "bodyFat": 0.22,
      "water": 0.55,
      "bone": 0.04,
      "zoneMinutes": null,
    },
  ],
  "quotes": { "disabledIds": [], "custom": [] },
  "notes": "",
}
```

Principles: **raw inputs only are stored** — every derived number (scores, penalties, BMI, FFMI, adherence) is computed by pure functions in `src/lib` (mirrors Excel's formula design, keeps import/export minimal and testable). The Classic/Lean program templates and the exercise catalog (names, entry type, rounds, per-arm/leg flags, ARX pairing) are **static app assets** generated once from the workbook (`src/data/`) — they contain no personal data and live in the repo.

The schedule itself is never stored: it is `materialize(program, startDate, ops)`. Consequently **a program exists exactly when `settings.startDate` is non-null**, and `startDate` is `null` on a fresh document — every body/setup field is nullable too, so the app boots into a valid, schema-passing empty state with nothing filled in.

## 9. Epics & user stories

Sizing: S ≈ ≤150 changed LOC, M ≈ ≤350, L ≈ ≤500 (hard cap per story; split if larger). Priorities: P0 = V1 cannot ship without; P1 = fast follow; P2 = future.
Every story additionally inherits the **Definition of Done** (§11.3) and the QA scenario matrix dimensions (§11.2).

E0–E8 below are the **v1.0.0 scope** and all shipped. Epics after v1.0.0 are
specified in their own documents rather than here — see _Post-v1.0.0 epics_ at
the end of this section. [`docs/stories/`](stories/) indexes every story, whichever
document defines it.

### EPIC E0 — Foundation & infrastructure

> Goal: a deployable, testable, installable empty shell. Everything else plugs into it.

- **US-001 · Project scaffold (M, P0)** — As the owner, I want a scaffolded Vite+React+TS app with lint, Prettier, Vitest, Playwright, Tailwind, Zustand and router in place so that every later story lands on rails.
  AC: `npm run dev/build/lint/typecheck/test/e2e` all succeed on a clean clone; CI-identical scripts; placeholder routes for the 6 top-level areas render.
- **US-002 · CI pipeline (S, P0)** — As the owner, I want every PR gated by lint + typecheck + unit tests + build (+ CodeQL, Dependabot) so that regressions are caught without me.
  AC: GitHub Actions workflow runs on PR and main; failing gate blocks merge; CodeQL + Dependabot configured.
- **US-003 · GitHub Pages deploy (S, P0)** — As the owner, I want main auto-deployed to GitHub Pages so that the app is always reachable at a stable URL.
  AC: Pages workflow publishes `dist` on push to main; Vite `base` path correct; SPA deep links work (404 fallback); PWA assets served correctly.
- **US-004 · Storage layer & schema (M, P0)** — As the athlete, I want my data persisted locally and versioned so that refreshes/updates never lose or corrupt it.
  AC: typed `AppState` + Zod schema; debounced persist; `schemaVersion` + migration hook; corrupted/missing storage → clean empty state + last-good snapshot recovery offer; unit tests for round-trip, migration, corruption.
- **US-005 · PWA (M, P0)** — As the athlete, I want the app installable and fully offline so that it works in the workout room regardless of connectivity.
  AC: manifest + icons; service worker precaches app shell; airplane-mode reload works; update flow prompts and applies without data loss.
- **US-006 · App shell & navigation (M, P0)** — As the athlete, I want mobile-first navigation across the 6 areas so that everything is ≤2 taps away.
  AC: bottom tab bar (mobile) / sidebar (desktop); active states; dark/light via system; layout verified at 375px and 1280px.

### EPIC E1 — Program template, converter & data lifecycle

> Goal: the Classic (and Lean) program encoded, and Excel data flowing in/out safely.

- **US-010 · Program templates & exercise catalog (L, P0)** — As the athlete, I want the exact Classic 90-day template (phases, recovery weeks, rest days, Ab Ripper pairing) and full exercise catalog in the app so that my plan matches the workbook. Lean template included as data (UI toggle arrives in US-073).
  AC: template derived from the workbook SCHEDULE (not hand-typed); catalog covers all 12 sheets with entry-type metadata (N/K, NC/C, R×W, per-arm/leg, ARX 11, completion-style); golden test: generated day list for a given start date with zero ops matches the workbook's original (pre-skip) schedule; works for any start weekday.
- **US-011 · xlsm→JSON converter (L, P0)** — As the athlete, I want a script that converts my workbook into the import file so that nothing I've logged is retyped.
  AC: `tools/convert_xlsm.py <file.xlsm> -o p90x-data.json` extracts settings, skips (blank-N rows → skip ops), all workout entries incl. week annotations/notes/completion states, body log; prints a verification report (counts per sheet, date range, detected skips); output validates against the Zod/JSON schema; output path gitignored; golden fixture: synthetic mini-workbook in repo tests the extractor cell-map.
- **US-012 · Import flow (M, P0)** — As the athlete, I want to import my JSON with a preview and confirmation so that I know exactly what I'm loading (and the app never auto-loads it).
  AC: fresh app starts EMPTY with visible "Import data" affordance; file picker → schema validation → preview (counts, date range, program day) → explicit confirm replaces state; pre-import auto-backup of previous state with one-click restore; invalid file → specific human-readable errors; wrong `schemaVersion` → migration or clear message.
- **US-013 · Export, backup & reset (S, P0)** — As the athlete, I want one-tap export and a guarded reset so that my data survives device loss and I can start over deliberately.
  AC: export downloads schema-valid JSON (import→export→import is lossless — property test); "last backup N days ago" reminder ≥7 days; reset requires typed confirmation and offers export first.
- **US-014 · Sample dataset (S, P0)** — As a visitor/test-runner, I want a fabricated demo dataset so that the public app and E2E tests exercise realistic data with zero personal exposure.
  AC: clearly-fake sample importable from the empty state ("Try with sample data"); used by E2E fixtures; no real values from the owner's file.

### EPIC E2 — Schedule & program navigation

- **US-020 · Schedule derivation engine (M, P0)** — As the athlete, I want the day-by-day schedule computed from template + ops so that dates, phases and weeks are always consistent.
  AC: pure function `(template, startDate, ops[]) → Day[]`; invariants tested: all 90 program days present exactly once regardless of ops; dates contiguous; phase/week labels correct; projected end = last day's date; golden test reproduces the workbook's post-skip schedule.
- **US-021 · Calendar view (M, P0)** — As the athlete, I want to see the whole program with status at a glance so that I know where I stand.
  AC: 13-week grid (desktop) / week strip (mobile); per-day status colors (done / partial / missed / rest / skipped / today / future); phase bands; tap → day detail; renders from sample and imported data.
- **US-022 · Today & day detail (M, P0)** — As the athlete, I want a Today screen with the scheduled workout(s) and quick actions so that starting a session is one tap.
  AC: shows date, program day X/90, workout chips incl. Ab Ripper pairing and rest days; actions: open log, mark done, reschedule; prev/next day navigation; empty/imported/mid-program states correct.
- **US-023 · Program status header (S, P0)** — As the athlete, I want day/phase/end-date status surfaced app-wide so that pace is always visible.
  AC: day X of 90, phase 1/2/3 + recovery-week indicator, planned (start+90) vs projected (schedule-derived) end date; matches workbook values for imported data.

### EPIC E3 — Rescheduling (explicit core requirement)

- **US-030 · Skip / shift remaining (M, P0)** — As the athlete, I want to insert rest day(s) at any date pushing all later workouts forward so that missed days don't wreck the plan (Excel-macro parity, no unprotect ritual).
  AC: date picker defaults to today; preview shows old→new dates for affected span + new projected end; confirm applies, calendar/logs/dates update everywhere (log sheets show shifted dates like Excel's live OFFSET); multiple consecutive skips supported; recorded in ops history.
- **US-031 · Undo & pull-forward (M, P0)** — As the athlete, I want to remove a skip (or undo any reschedule op) so that the schedule compresses back when I catch up.
  AC: ops history lists every reschedule with human description; any op revertible where consistent (conflicts explained); "pull forward" = remove chosen skip day; undo restores exact prior schedule (property test: apply→undo = identity).
- **US-032 · Move / swap single days (M, P0)** — As the athlete, I want to move one workout to another date or swap two days so that small life conflicts don't require shifting everything.
  AC: swap any two days in a selectable range with preview; move-to-empty (rest) day supported; logged data travels with its workout instance (integrity test: no orphaned/duplicated logs); phase boundaries respected or warned.
- **US-033 · Weekly template editor (L, P1)** — As the athlete, I want to remap which workout falls on which weekday from a chosen week forward so that the program fits my recurring weekly reality.
  AC: editor shows current weekday pattern; drag/assign all 7 slots (validation: every scheduled workout of that week's template appears exactly once); applies from selected week forward only; preview + confirm; expressed as an op (undoable).
- **US-034 · Reschedule integrity & audit (S, P0)** — As the athlete, I want a visible history and hard guarantees so that no workout or logged data is ever lost by rescheduling.
  AC: audit list (op, when, effect); property-based tests over random op sequences assert invariants from US-020; attempting an inconsistent op → clear refusal reason, state unchanged.

### EPIC E4 — Workout logging

- **US-040 · Scoring engine (M, P0)** — As the athlete, I want the exact Excel scoring rules computed live so that my numbers stay comparable across the whole round.
  AC: pure TS lib implements §6.3 incl. settings parameters; golden-master fixtures lifted from the workbook pass (scores + penalties per exercise per week); canonical penalty rule (B3) documented in code.
- **US-041 · Strength log — grid view (L, P0)** — As the athlete, I want the familiar week-column grid per workout so that I can review and edit any week like in Excel.
  AC: all 7 strength sheets render their exercises ×2 rounds with correct field types (N/K, NC/C, R×W, per-arm/leg); week dates pulled from schedule (shift with reschedules); live score/penalty display with red/green round-2 indication (Excel color parity); editable week-header annotation + per-session notes; mobile: one week visible with week switcher; desktop: multi-week grid.
- **US-042 · Entry accelerators (M, P0)** — As the athlete, I want ghost prefill of my last session plus steppers/numeric keypad so that logging is fast with sweaty thumbs.
  AC: each field shows previous corresponding value as placeholder; one tap copies it; +/− steppers; `inputmode` numeric; touch targets ≥44px; works in grid and focus modes.
- **US-043 · Focus mode (L, P0)** — As the athlete, I want a one-exercise-at-a-time flow so that logging follows the workout video's rhythm.
  AC: launches from Today/log for the scheduled session; ordered exercise cards with round 1/2 inputs, prev/next, progress indicator, per-exercise history sparkline; finishing marks session complete + summary (total score, PRs vs last time); resumable if interrupted.
- **US-044 · Cardio-style logging (S, P0)** — As the athlete, I want YES/NO/NOT YET + notes for Plyo/Kenpo/Yoga/Cardio X so that completion tracking matches the workbook.
  AC: session list per workout with status cycle + notes (imported values render); one-tap "mark done" from Today; rest days can be marked "Rest" or "X Stretch done".
- **US-045 · Ab Ripper X log (M, P0)** — As the athlete, I want the 11-exercise reps grid per session so that ARX tracking continues seamlessly.
  AC: sessions auto-paired to strength days per template; reps per exercise with prefill/steppers; total-reps per session computed; imported data renders.
- **US-046 · Rest/interval timer (S, P1)** — As the athlete, I want a simple timer with beep/vibration so that rests stay honest inside focus mode.
  AC: configurable presets; runs with screen awake (wake-lock where supported); beep + vibrate (feature-detected); usable standalone and inside focus mode.
- **US-047 · Completion status rules (S, P0)** — As the athlete, I want consistent done/partial/missed derivation so that calendar and adherence numbers are trustworthy.
  AC: documented pure rules — strength/ARX: any entry ⇒ partial, explicit complete ⇒ done; cardio: YES ⇒ done, NO ⇒ missed, NOT YET+past ⇒ missed; unit tests; drives US-021 colors and US-062 metrics.

### EPIC E5 — Body log

- **US-050 · Body log entry & derivations (M, P0)** — As the athlete, I want daily scale entries with all derived metrics computed so that the SCHEDULE weigh-in workflow survives intact.
  AC: per-date entry (weight, BF%, water%, bone%, optional zone-minutes); edit/delete; derived BMI/BF-kg/lean-mass/FFMI+category/weight-loss per §6.3 with golden tests from workbook rows (e.g. the sample's latest weigh-in 80.8 kg / 21.2% → BMI 24.94, FFMI 19.65, "Average"); unit-aware (metric/imperial).
- **US-051 · Body log list & thresholds (S, P0)** — As the athlete, I want the log color-coded against targets/limits so that I see red/amber/green at a glance like the Excel conditional formatting.
  AC: list/table with threshold coloring vs SETUP-derived limits & targets; missing-day gaps visible; quick-add for today from Dashboard/Today.

### EPIC E6 — Dashboard & analytics

- **US-060 · Dashboard assembly (M, P0)** — As the athlete, I want one screen answering "where am I and what's next" so that I open the app and act.
  AC: phase/next-workout card, quote of the day, body-vs-target KPI cards, adherence card, entry points to charts; sensible empty state pre-import; loads <1s on repeat visit (local data).
- **US-061 · Body trend charts (M, P0)** — As the athlete, I want weight/BF%/BMI/lean-mass/FFMI trends vs start, target and limit lines so that progress vs the SETUP targets (sample: 77.554 kg / 15%) is unmistakable.
  AC: line charts with baseline (start), target and upper-limit reference lines; progress-to-target % per metric ("actuals vs. starting metrics"); range filter (phase/all); gaps for missing days; renders imported history correctly.
- **US-062 · Adherence & pace (M, P0)** — As the athlete, I want completion/streak/pace stats so that discipline is measured, not felt.
  AC: % program complete, done vs scheduled counts, current streak, skip count, planned vs projected end delta, weekly completion bars; all derived from US-047 rules; golden test vs imported state.
- **US-063 · Strength progression charts (L, P0)** — As the athlete, I want per-exercise net-score lines across weeks with series toggles so that the Excel DATA/chart experience is surpassed.
  AC: per-workout chart of exercise series (net = score − penalty), gaps for missing weeks; per-series toggle + all-on/off (Check/UncheckAll parity); first-vs-latest delta table ("top movers"); values match US-040 engine (golden vs workbook DATA).
- **US-064 · Motivational quotes (M, P0)** — As the athlete, I want a daily quote I can curate so that the app pushes me like Tony does.
  AC: offline pack ≥90 quotes; only verifiable real-person attributions, otherwise unattributed/original lines (no fabricated attributions); deterministic per program-day (stable across reloads); shown on Dashboard + workout completion; Settings editor: add/edit/disable, custom quotes stored in user data and survive export/import.

### EPIC E7 — Settings & extras

- **US-070 · Settings screen (M, P0)** — As the athlete, I want every SETUP parameter editable with guardrails so that the app fits me without formula surgery.
  AC: all §6.1-SETUP fields incl. units toggle (values re-displayed correctly), scoring params, targets/limits with derived read-outs (target weight etc. incl. "check values" guard); changing start date on a program with data requires explicit confirm + explains schedule re-anchoring; all changes persist and propagate live.
- **US-071 · Notes page (S, P1)** — As the athlete, I want a free-form notes area so that YOUR NOTES has a home.
  AC: autosaving text area in user data; included in export/import.
- **US-072 · Body-fat calculators (M, P1)** — As the athlete, I want the Navy/3-site/7-site calculators so that BF% can be estimated without a scale.
  AC: all three methods, male/female variants, unit-aware, formulas verbatim from CALCULATORS (golden tests vs workbook sample outputs); "use as starting BF%" writes to settings with confirm.
- **US-073 · Lean variant toggle (L, P1)** — As the athlete, I want to switch Classic↔Lean so that the workbook's program selector is preserved.
  AC: settings toggle re-derives schedule from Lean template (Cardio X, Core Syn (Lean) active); mid-program switch shows impact preview + confirm; logged data never deleted (sessions remain attached to their workout type); reschedule ops replay or are safely invalidated with explanation; golden test: Lean day-1 = Core Synergistics per workbook.
- **US-074 · Help / About (S, P1)** — As the athlete, I want the abbreviations legend and data policy so that the app is self-explanatory.
  AC: abbreviations from INSTRUCTIONS (R/W, NC/C, N/K, RA/LA, RL/LL); privacy note (all data local, nothing uploaded); app version + link to repo.

### EPIC E8 — Hardening & release

- **US-080 · E2E journey suite (L, P0)** — As the owner, I want Playwright coverage of the critical journeys so that releases are safe with minimal manual review.
  AC: journeys — fresh start→sample import; sample import→dashboard numbers assert; log strength session via focus mode; each reschedule mode incl. undo; body entry→dashboard update; reset→backup→restore; corrupt-storage recovery. All green in CI.
- **US-081 · Performance & accessibility pass (M, P1)** — As the athlete, I want the app fast and usable so that it never adds friction.
  AC: Lighthouse (mobile emulation) performance/accessibility/best-practices ≥90, gated in CI; keyboard navigable (skip link, visible focus); contrast AA; touch targets ≥44px.
- **US-082 · Resilience & error UX (M, P0)** — As the athlete, I want graceful failure so that bugs never eat data.
  AC: global error boundary with recovery UI + "export/restore" escape hatch; storage-quota and corruption paths show recovery UI (restore last-good snapshot); import failures never mutate existing state (atomicity).
- **US-083 · Docs & handover (S, P0)** — As the owner, I want README + agent playbook so that humans and AI agents can operate the repo.
  AC: README (what/why, converter usage, privacy stance, dev commands); CLAUDE.md with the story-execution protocol (Appendix C); sanitized PRD.md and docs/stories/ checked in.

### Post-v1.0.0 epics

This PRD is frozen at the v1.0.0 scope. Each later epic carries its own
specification — problem, goals, non-goals, design, stories with ACs, scenario
matrix, risks — under [`docs/epics/`](epics/), and inherits §11.2 and §11.3
unchanged. The story index links both.

| Epic                                                              | Stories         | Status       |
| ----------------------------------------------------------------- | --------------- | ------------ |
| [E9 — Fresh-start onboarding](epics/E9-fresh-start-onboarding.md) | US-084 → US-088 | ✅ delivered |

## 10. Success metrics

| Metric          | Target                                                                                | How measured                                |
| --------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- |
| Import fidelity | 100% of workbook-entered values present post-import; engine outputs match Excel ±0.01 | Converter report + golden-master test suite |
| Data safety     | Export→import round-trip lossless; zero data-loss defects                             | Property tests + E2E; defect log            |
| Logging speed   | Strength session loggable ≤90 s (focus mode + prefill)                                | Manual timing on phone, week 1 of use       |
| Quality gates   | CI green on main; unit coverage target on `src/lib`; E2E journeys green               | GitHub Actions                              |
| PWA             | Installable + full offline reload                                                     | Lighthouse + Playwright offline test        |
| Adoption (n=1)  | Used for every remaining program day                                                  | Owner's own usage                           |

## 11. QA strategy

### 11.1 Golden-master parity

The workbook is the oracle. Converter fixtures + engine golden tests assert the app reproduces Excel's computed values (scores, penalties, DATA net scores, body derivations, schedule dates incl. the real skips) for the real data shape, using the fabricated sample for CI (real file tested locally only, in a gitignored test that is skipped in CI).

### 11.2 QA scenario-matrix dimensions (applied per story)

- **Happy path** — the AC flows above.
- **Variation** — metric vs imperial; Classic vs Lean; grid vs focus entry; mobile vs desktop; dark vs light.
- **Edge** — day 1 / recovery weeks / day 90 boundaries; start dates on any weekday; DST transitions & local-date math (no UTC drift); leap-day-adjacent dates; empty rounds; zero/huge rep counts; penalty toggle off; chairFactor=1; consecutive skips; move onto occupied day; template remap of recovery weeks; quota-full localStorage.
- **Failure** — malformed/expired-schema import; corrupted localStorage; storage quota exceeded; SW update mid-session; file-picker cancel.
- **Regression-fragile** — schedule invariants after random op sequences (property-based); scoring parity fixtures; export/import round-trip; status derivation vs calendar colors vs adherence consistency.
- _(No auth/rate-limit/server dimensions — there is no backend.)_

### 11.3 Definition of Done (every story)

All ACs demonstrably met · unit tests for new logic (lib code: required) · E2E updated if a journey changed · lint/typecheck/tests/build green locally and in CI · no `TODO`/dead code/console noise · docs touched if behavior is user-visible · Conventional Commit(s) · PR description states what/why/how + AC checklist.

## 12. Release plan

| Phase           | Contents                                                                                              | Gate                                                             | Status                         |
| --------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------ |
| **V1 core**     | E0 → E1 → E2 → E3 (US-030/031/032/034) → E4 (minus US-046) → E5 → E6 → US-070, US-080, US-082, US-083 | Owner demo: import real file locally, use for a real workout day | ✅ shipped · ⏳ demo gate open |
| **V1.1 extras** | US-033, US-046, US-071, US-072, US-073, US-074, US-081                                                | CI green + owner spot-check                                      | ✅ shipped                     |
| **Post-v1.0.0** | E9 (US-084 → US-088) and any later epic, each spec'd under `docs/epics/`                              | CI green + per-epic merge                                        | ✅ E9 shipped                  |
| Ongoing         | Hardening, quote-pack curation, feedback fixes                                                        | —                                                                | —                              |

E0–E8 shipped as **v1.0.0**; E9 followed on `main`. The one V1 gate still open is
the **owner demo** — importing the real workbook locally and using the app for a
real workout day. It is a human check, not a build task.

Sequencing note: epics are ordered by dependency (E0/E1 unblock everything; E3 depends on E2's engine; E6 depends on E4/E5 data). Delivered epic-by-epic, one PR per epic, squash-merged after CI is green.

## 13. Risks & mitigations

| Risk                                                                       | Mitigation                                                                                                 |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| iOS/Safari may evict localStorage after long inactivity                    | Export reminders (US-013), one-tap backup, restore flow; data file is the durable copy                     |
| Converter misreads a workbook edge (merged cells, shifted rows from skips) | Position-based cell maps + verification report + golden fixtures; owner eyeballs the import preview counts |
| Scope is maximal (all 4 reschedule modes, all extras)                      | Strict story caps (≤500 LOC), P0/P1 split, V1/V1.1 phasing; extras can slip without blocking core          |
| Date math bugs (DST/timezones)                                             | Local-calendar ISO dates everywhere, no `Date` UTC arithmetic; dedicated edge tests                        |
| Copyright (P90X trademarks)                                                | Factual data only, no branding assets, personal non-commercial use, repo README disclaimer                 |
| Quote misattribution                                                       | Pack policy: verifiable attributions only, else unattributed                                               |

## 14. Open questions (resolved during delivery)

| #   | Question                                                                 | Resolution                                         |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| Q1  | GitHub account/org to own `p90x-webapp` + authorization to create it     | Owner created the public repo                      |
| Q2  | Confirm GitHub Pages as hosting                                          | Yes                                                |
| Q3  | Canonical penalty rule (B3: compare adjusted totals) — accept deviation? | Accepted; documented in `scoring.ts` + golden test |
| Q4  | Quote pack content review before merge                                   | Reviewed at PR; pack is unattributed               |

---

## Appendix A — Excel → App mapping quick reference

| Excel habit                               | App equivalent                                            |
| ----------------------------------------- | --------------------------------------------------------- |
| Open SCHEDULE, type weight in col B       | Body tab → quick-add (or Today card)                      |
| Click workout hyperlink in col N          | Today → workout chip → Focus mode                         |
| Type reps in week column                  | Focus mode with ghost prefill (grid view still available) |
| Unprotect + select col N cell + run macro | Schedule → day → "Skip day" (preview + undo)              |
| Check/uncheck chart series boxes          | Chart legend toggles + all-on/off                         |
| SETUP orange cells                        | Settings screen                                           |
| CLEAR CONTENT button                      | Settings → Data → Reset (guarded)                         |

## Appendix B — Converter cell-map (summary)

- SETUP: fixed cells (C7 program, C9 start, C15 units, C17 gender, C22–C25 stats, C32–C34 limits, C37–C38 targets, C44/C45/C47/C49 scoring).
- SCHEDULE rows 16+: A=date, B/E/G/H=weight/BF/water/bone, L=zone-min, N=workout name (blank N with in-range date ⇒ skip op), phase markers col Q.
- Strength sheets: week blocks of 5 columns starting col B (B..F, G..K, …); row 4 = week label/annotation, row 5 = date (ignored — re-derived), exercise row-pairs: main-reps col, assisted/weight col, score/penalty col (ignored — recomputed).
- Cardio sheets: week header row, date row, COMPLETED? row, NOTES row per block.
- ARX: week/day/date header rows, 11 exercise rows × session columns.
- Output report: per-sheet extracted counts + detected skips + date range; exits non-zero on unexpected shapes.

## Appendix C — Agentic execution playbook (methodology, right-sized)

**Repo:** public GitHub `p90x-webapp`. Branch model: `main` (deploys to Pages) ← PR per epic from `claude/epic-eN-<slug>` branches. Conventional Commits. PR body embeds the story ACs.

**Right-sizing vs. the generic enterprise pipeline:** oxlint + tsc + Vitest + Playwright + CodeQL + Dependabot replace SonarQube/Snyk/Codacy (no backend, no secrets, public repo gets CodeQL free). AI code review via Claude Code (`/code-review`). No staging environment — PR build artifact + E2E suite + Lighthouse budget is the gate; Pages deploy on merge is production.

**Story execution loop (per US-xxx):**

1. Read `docs/stories/` (story text = PRD §9 entry + any addenda).
2. Investigate current code (zero-assumption; read before writing).
3. Plan the diff; write scenario matrix rows for the story (§11.2 dimensions).
4. Implement smallest diff satisfying ACs; tests alongside (lib logic first).
5. Self-validate: `npm run lint && npm run typecheck && npm run test && npm run build` (+ e2e if journey-touching).
6. Static self-review of the diff; then adversarial review pass.
7. PR with what/why/how + AC checklist; CI must be green; owner merges.

**Constraints (per story):**

- Modify only files needed for this story; list any out-of-scope file touched in the PR description with justification.
- Derived values are NEVER stored — extend `src/lib` pure functions + tests.
- Respect schema: bump `schemaVersion` + write a migration if the shape changes.
- Excel parity: golden-master fixtures are the oracle (§11.1); intentional deviations only per §6.4.
- No new dependencies without stating why in the PR.

**Human gates (minimal):** PRD approval → repo authorization → per-epic merge → V1 demo gate. Everything else is autonomous.

**Parallelization policy:** default **sequential** story execution (small shared codebase; parallel agents on the same store/router cause merge churn). Parallelize only provably disjoint stories via isolated worktrees.

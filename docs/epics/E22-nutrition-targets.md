# Epic E22 — Nutrition targets (P90X plan + evidence-based layer)

> **Status:** delivered · **Stories:** US-130 → US-132
> **Ships as:** package **1.22.132**, displayed **`1.E22.U132`** · **Schema:** **v6 → v7** (`settings.nutrition`)
> **One-liner:** The app now tells you how many calories and which macro split
> to aim for — the boxed P90X Nutrition Plan numbers, phase-aware, side by side
> with an evidence-based recommendation derived from your own stored targets.

---

## 1. Design

- **Two layers, clearly labelled.** The **P90X plan** layer encodes the
  published Nutrition Plan guide verbatim; the **Your target** layer is an
  evidence-based recommendation from current weight, target weight and body
  composition. They render as separate labelled sections and never blend.
  (As shipped they sat side by side; the E27 B02 bug-fix release — PR #44 —
  leads the Today card with **Your target** and collapses the booklet plan
  behind a disclosure.)
- **The guide — not the workbook — is the oracle here.** The workbook's
  nutrition tabs were excluded from the port, so rule 1's golden-master
  discipline applies to the guide's published numbers instead, sourced and
  tiered in [`docs/requirements/nutrition-targets.md`](../requirements/nutrition-targets.md).
- **Pure engine** (`src/lib/nutrition.ts`, rule 2 — every number derived):
  - P90X plan: RMR = weight (lb) × 10, + 20% daily activity, + 600 kcal
    workout → energy amount → level chart (I/II/III = 1800/2400/3000 kcal),
    split into protein/carb/fat grams by the day's nutrition phase
    (Fat Shredder 50/30/20, Energy Booster 40/40/20, Endurance Maximizer
    20/60/20). The nutrition phase follows the **materialized** day's training
    phase, so skips/remaps move it with the workouts.
  - Evidence-based layer: TDEE from Katch–McArdle when lean mass is known
    (else Mifflin–St Jeor), ×1.55 activity factor, plus the surplus/deficit to
    reach the stored target weight over the remaining program window
    (~7700 kcal/kg) — clamped to muscle-sparing rate bands (Helms ≤1%/wk loss,
    ~0.5%/wk usable gain) and floored at BMR. Protein 1.6–2.2 g/kg (raised in
    a deficit), fat 0.8 g/kg (0.5 floor), carbs as the remainder. Reuses E20's
    remaining-horizon helper. Not medical advice — labelled as such.
- **Persisted setting (schema v7):** `settings.nutrition`
  (`phaseOverride`, `calorieOverride`), migration `6:` backfills defaults.
  Raw user preferences only; every target number stays derived.
- **UI:** a **Nutrition** card on Today/day pages (day's kcal + macro grams,
  both layers); a **Nutrition** section in Settings — derived energy amount /
  level / daily target (latest weigh-in, start weight as fallback), the phase
  override (Auto follows the training blocks), a custom daily-calorie
  override, and the three-phase split table.

## 2. Stories

### US-130 — pure nutrition engine + schema v7 (M, P0)

`src/lib/nutrition.ts` with the guide encoding and the evidence-based math;
`settings.nutrition` + `SCHEMA_VERSION = 7` + migration. Unit tests pin the
guide's published numbers (level chart, phase splits) and the target math.

**AC:** [x] guide numbers reproduced exactly · [x] v1–v6 documents migrate
cleanly · [x] no derived value stored.

### US-131 — Today card + Settings section (M, P0)

`NutritionCard` on Today/day pages; the Settings Nutrition section with
overrides and the phase table, collapsed by default for compact layout.

**AC:** [x] nutrition phase follows the materialized day (skips/remaps move
it) · [x] overrides round-trip through export/import.

### US-132 — evidence-based layer, docs & release (M, P1)

The **Your target** panel on both surfaces, tier-labelled and sourced in
`docs/requirements/nutrition-targets.md`; e2e coverage on both Playwright
profiles; CHANGELOG + version bump.

**AC:** [x] both layers visible side by side · [x] sources cited with
evidence tiers · [x] full validation suite green.

## 3. Out of scope

Food logging or meal tracking (the app recommends targets, it does not track
intake); portion plans and recipes from the guide; syncing targets to any
external service. Recomposition-aware targets and diet styles arrived next as
**E24**.

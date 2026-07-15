# Epic E24 — Recomposition-aware targets & low-carb diet style

> **Status:** delivered · **Stories:** US-136 · **PR:** #39
> **Ships as:** package **1.24.136**, displayed **`1.E24.U136`** · **Schema:** **v8 → v9** (`settings.nutrition.dietStyle`) · **Depends on:** E22 (nutrition layer), E23 merged (package 1.23.135)
> **One-liner:** The evidence-based target layer stops collapsing the stored
> body targets into one scale-weight number — a lose-fat-plus-gain-lean plan
> now reads as a **Recomp** goal with its own energy budget and paces — and a
> new **Diet style** setting adds a low-carb variant.

---

## 1. Design

- **The problem.** E22's target layer netted everything into one scale-weight
  delta, so a recomp goal (lose fat, gain lean) read as near-maintenance: no
  real deficit, protein dropped to 1.8 g/kg, and the FFMI target was ignored
  entirely. It also aimed at `body.ts`'s `targetWeight` — the workbook's
  chart-parity formula frozen at day-1 stats.
- **`targetComposition`** (`src/lib/nutrition.ts`) resolves lean-mass
  increase, body-fat % and FFMI targets — **any one is enough** — into a
  target lean/fat pair anchored to the **latest weigh-in**. The workbook's
  quirky `targetWeight` formula is untouched: it still anchors the body-chart
  colour scales (rule 1) but no longer leaks into the evidence-based layer.
- **`targetNutrition`** budgets each tissue delta at its own energy density
  (adipose ~7700, lean ~1800 kcal/kg — Hall 2008; netting both at 7700
  understated a recomp's deficit by the planned lean gain) and clamps each
  weekly pace to its own muscle-sparing band. A fat-loss-plus-lean-gain
  target reads as a **Recomp** goal with protein held at 2.2 g/kg whenever
  fat loss is intended (Barakat 2020) and both weekly paces shown.
- **Diet style (schema v9):** `settings.nutrition.dietStyle`
  (`'balanced' | 'lowCarb'`, migration `8:` backfills `'balanced'`).
  _Low-carb_ caps the carb fill at the <130 g/day consensus threshold
  (ADA / Feinman 2015) and moves the spare calories into fat; calories and
  protein are unchanged.
- **UI:** the Today card and Settings surface the goal chip (Cut / Gain /
  Recomp / Maintain), fat/lean weekly paces, the diet-style toggle and a
  capped-carb indicator. Sources and evidence tiers added to
  [`docs/requirements/nutrition-targets.md`](../requirements/nutrition-targets.md).

## 2. Stories

### US-136 — recomposition-aware targets, diet style, docs & release (L, P0)

Everything above in one story: `targetComposition` + the per-tissue energy
budget with unit tests, schema v9 + migration, the UI surfaces, e2e coverage
for the recomp numbers and the low-carb toggle, requirement-doc sources,
CHANGELOG + version bump. Numbered as its own epic (package 1.24.136) so the
package version stays monotonic past E23's 1.23.135.

**AC:** [x] any one stored target (lean gain, BF %, FFMI) is enough to derive
a composition target · [x] recomp goals get a real deficit and 2.2 g/kg
protein · [x] low-carb caps carbs at <130 g/day with calories/protein
unchanged · [x] v1–v8 documents migrate to v9 with `dietStyle: 'balanced'` ·
[x] the workbook `targetWeight` formula remains chart-only.

## 3. Out of scope

Ketogenic macro presets (the cap is the consensus low-carb threshold, not
keto); carb cycling; user-editable energy densities or pace bands; any change
to the boxed P90X plan layer.

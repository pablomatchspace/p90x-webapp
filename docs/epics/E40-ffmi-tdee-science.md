# Epic E40 — FFMI statistic, reference scale and a validated TDEE

> **Status:** delivered · **Stories:** US-177, US-178
> **Ships as:** package **1.40.178**, displayed **`1.E40.U178`** · **Schema:** unchanged (v14)
> **One-liner:** a start → current → change → target FFMI card with a sourced visual scale on the
> Body page and dashboard, and a factorial, schedule-aware TDEE replacing the flat BMR × 1.55.

## 1. Decisions (owner, 2026-10-27)

| Topic | Decision |
|---|---|
| Normalization | **Keep Kouri 1.80 m.** A 1.65 m reference is unpublished and would only shift every value by ≈ 0.92 |
| Where | **Body page + dashboard** |
| Scale | **Normalized scale with sourced anchors**, not the workbook names; **same bar for everyone + female ceiling marker** |
| TDEE | **Factorial, schedule-aware average** (not separate training/rest days, no new setting) |
| BMR | **Mean of Katch–McArdle and Cunningham**; Mifflin–St Jeor fallback and cross-check |
| Daily-life factor | **× 1.4** (range 1.3–1.5) |

Sources, MET table and caveats: [`docs/requirements/ffmi-tdee-science.md`](../requirements/ffmi-tdee-science.md).

## 2. Stories

### US-177 — FFMI statistic and reference scale (M, P1)

`ffmiSummary` (start from day-1 stats, current from the latest complete weigh-in, change, target,
progress) and `FFMI_BANDS` (Low / Below average / Above average / Athletic / Above the usual natural
range) in `lib/body/ffmiScale.ts`. `FfmiCard` renders the stat and `FfmiScale` bar with start /
current / target markers (and the 23.9 ceiling tick for women). `ffmiCategory` now returns the band
label everywhere.

**AC:** [x] bands pinned at 17 / 19 / 21 / 25 · [x] summary tests · [x] Body page card + legend + sources ·
[x] dashboard compact card · [x] Settings target picker shows the scale with the draft target (B01) · [x] female ceiling marker · [x] FFMI value still equals the workbook golden row.

### US-178 — Factorial TDEE (M, P1)

`lib/nutrition/energy.ts`: `estimateBmr` (mean of the two lean-mass equations, Mifflin fallback),
`WORKOUT_ENERGY` (minutes × MET per workout), `averageExerciseKcal` over the program template,
`estimateTdee` with an RSS range. `targetNutrition` consumes it; Today and Settings show
`TDEE = BMR × 1.4 + workouts` with the range and the equation cross-check.

**AC:** [x] every scheduled workout has an energy entry (guard test) · [x] net-MET maths · [x] TDEE =
BMR × 1.4 + exercise · [x] range · [x] target calories follow exercise one-for-one · [x] Today/Settings copy ·
[x] sample persona: 2 906 kcal (was 2 705).

## 3. Result worth knowing

The owner doubted that 2 516 kcal is credible. The rigorous model does **not** lower it: the arithmetic
was right (1 623 × 1.55), and for a six-day schedule the factorial estimate is higher (≈ +7 % on the
sample persona), landing near the P90X booklet's own formula. The honest message is the range.

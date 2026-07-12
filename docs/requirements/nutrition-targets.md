# E22 — Nutrition targets (calories & macros)

## Scope and relation to the PRD

PRD §out-of-scope excluded the workbook's nutrition tabs (setup, portion plan,
calories, WEEK n CALs) — that exclusion covered porting the workbook's meal /
portion tracking, and it stands: the app still tracks no food. E22 adds only the
**targets read-out** the app was silent about: how many calories and which macro
split the athlete should aim for on a given program day.

Because the workbook's nutrition tabs were never ported, workbook-oracle rule 1
cannot apply here. The oracle for this epic is the published **P90X Nutrition
Plan guide** ("Eating for Power Performance", Beachbody, shipped with the
program), encoded verbatim below.

## Formulas (P90X Nutrition Plan, Part I "Determine your nutrition level")

1. **Resting metabolic rate**: `RMR = body weight (lb) × 10`
2. **Daily activity burn**: `DAB = RMR × 20%`
3. **Exercise expenditure**: `+ 600 kcal` (the guide's flat estimate for one
   P90X workout)
4. **Energy amount**: `EA = RMR + DAB + 600`
5. **Nutrition level** (the guide's chart):

   | Energy amount | Level | Daily plan |
   | ------------- | ----- | ---------- |
   | 1800–2399     | I     | 1800 kcal  |
   | 2400–2999     | II    | 2400 kcal  |
   | 3000+         | III   | 3000 kcal  |

   An energy amount **below 1800 rounds up to Level I** — 1800 kcal is the
   guide's minimum plan.

The app computes EA from the **latest logged weigh-in weight**, falling back to
the start weight (weights are stored in kg; the formula converts through the
exact factor 0.45359237 kg/lb). A user-set custom daily-calorie override
replaces the level plan (the guide itself invites moving between levels if
results stall).

## Macro split per phase (Part II "The three phases")

| Phase | Name                | Protein | Carbs | Fat |
| ----- | ------------------- | ------- | ----- | --- |
| 1     | Fat Shredder        | 50%     | 30%   | 20% |
| 2     | Energy Booster      | 40%     | 40%   | 20% |
| 3     | Endurance Maximizer | 20%     | 60%   | 20% |

Percentages are **calorie shares**; grams use the Atwater factors 4 kcal/g
(protein, carbs) and 9 kcal/g (fat).

**Phase timing**: by default the nutrition phase follows the training blocks
exactly as the schedule materializes them (`ProgramDay.phase`: weeks 1–4 /
5–8 / 9–13), so skips and remaps move the nutrition phase with the workouts.
The guide explicitly permits staying in an earlier phase longer ("if it's still
working, stay with it"), so `settings.nutrition.phaseOverride` pins a phase;
`null` means follow the schedule.

## Storage (rule 2 — never store derived values)

Only the two raw overrides persist, in `settings.nutrition` (schema v7):

```ts
nutrition: {
  phaseOverride: 1 | 2 | 3 | null   // null = follow the training phase
  calorieOverride: number | null    // kcal; null = follow the level chart
}
```

Energy amount, level, daily calories and gram targets are all recomputed by
pure functions in `src/lib/nutrition.ts`, pinned by unit tests on the guide's
worked numbers (180 lb → EA 2760 → Level II → 2400 kcal; Fat Shredder at
2400 kcal → 300 g protein / 180 g carbs / ~53 g fat).

## Target-based recommendation (evidence-based layer)

The P90X guide numbers above are **goal-blind** — they state what the boxed
program prescribes, not what it takes to reach _this_ athlete's stored target.
A second engine (`targetNutrition` in `src/lib/nutrition.ts`) derives calories
and macros from the user's current stats, their target weight, and the
remaining program window, using current sports-nutrition consensus. Both layers
are shown side by side and clearly labelled; the program numbers are never
silently overwritten.

### Energy

1. **BMR**:
   - **Katch–McArdle** `370 + 21.6 × lean mass (kg)` when lean mass is known
     (latest complete weigh-in, else start stats) — preferred because it keys
     off body composition, which the app already tracks.
   - **Mifflin–St Jeor** `10 × kg + 6.25 × cm − 5 × age + s` (`s = +5` male,
     `−161` female) otherwise — the best population-validated equation
     (within 10% of measured RMR for ~71–82% of adults).
2. **TDEE** = BMR × **1.55** (moderately active — P90X is ~1 h of demanding work
   ~6 days/week).
3. **Goal calories** = TDEE + the daily surplus/deficit implied by moving from
   the current weight to the target weight over the remaining weeks
   (~**7700 kcal per kg** of body-weight change), then:
   - clamped to muscle-sparing rate ceilings — fat loss ≤ **1%/week** (Helms;
     the same Tier-A band E20's Reality check already uses) and usable lean gain
     ≤ ~**0.5%/week** (larger surpluses mostly add fat);
   - floored at BMR so a deficit never prescribes a crash intake.

### Macros

- **Protein**: `1.8 g/kg` body weight at maintenance/surplus, raised to
  `2.2 g/kg` in a deficit — within the 1.6–2.2 g/kg hypertrophy band (Morton
  meta-analysis plateau ≈ 1.62 g/kg; ISSN 1.4–2.0) and higher when dieting, per
  Helms' case for higher intakes in lean, energy-restricted athletes. This is
  the key correction over the guide's percentage split, which swings protein
  wildly with calorie level (e.g. Phase 3's 20% at 1800 kcal is only 90 g).
- **Fat**: `0.8 g/kg`, with a `0.5 g/kg` floor for hormonal health.
- **Carbs**: the remainder of the calorie budget — which recreates the guide's
  "more carbs in the endurance phase" direction without hard-coding a
  percentage.

The remaining window matches E20's Reality-check horizon: a not-yet-started or
absent program plans a full 90 days; a finished program plans a fresh 90-day
block; otherwise it's the days left (0–90). Nothing here is stored (rule 2).

### Evidence tiers (as in `ffmi-feasibility.md`)

- Protein 1.6–2.2 g/kg for hypertrophy — **Tier A** (Morton 2018 meta-analysis;
  ISSN 2017 position stand).
- Higher protein in a deficit for lean athletes — **Tier A−/B** (Helms 2014
  systematic review).
- Fat-loss rate 0.5–1%/week muscle-sparing — **Tier A** (Helms 2014; already
  cited by E20).
- Mifflin–St Jeor / Katch–McArdle BMR — **Tier A** (validated predictive
  equations), with the caveat that ~26% of RMR variance is unexplained by any
  formula, so the estimate is a starting point to adjust from the actual weight
  trend (which the app charts, E21).
- Activity factor 1.55 and the ~0.5%/week usable-gain ceiling — **Tier B**
  (practitioner heuristics).

Not medical or dietetic advice.

## Surfaces

Both layers appear together, clearly labelled, on each surface:

- **Today / day page** (`NutritionCard`): a **P90X plan** section (daily kcal +
  per-macro grams and shares for that day's phase, phase name and override
  indicators) and a **Your target** section (goal chip, evidence-based kcal, and
  protein/fat/carb grams with their g/kg basis). Shown on every program day
  (rest days included — the plan prescribes eating for the week, not just
  workout days); hidden on gap days and outside the program, where no phase
  exists.
- **Settings → Nutrition**: the P90X derived read-outs (energy amount, level,
  daily target), the two overrides, the three-phase split table, and a
  **Target-based recommendation** panel (BMR method + TDEE + goal calories, the
  weekly pace to reach the target, and the g/kg macro targets with tier labels).

Not medical or dietetic advice.

## Sources

P90X guide numbers:

- P90X Nutrition Plan (official guide PDF, "nutrition plan EATING FOR POWER
  PERFORMANCE"), Beachbody — level chart p. 5, phase splits pp. 6–7.
- Secondary confirmations of the same tables:
  [90dayworkoutplan.com/about/p90x-nutrition-plan](https://www.90dayworkoutplan.com/about/p90x-nutrition-plan/),
  [travelingworkout.wordpress.com/p90x-nutrition-guide](https://travelingworkout.wordpress.com/p90x-nutrition-guide/).

Evidence-based layer:

- Morton RW et al. (2018), _A systematic review, meta-analysis and
  meta-regression of the effect of protein supplementation on resistance
  training-induced gains in muscle mass and strength in healthy adults_, Br J
  Sports Med — protein plateau ≈ 1.62 g/kg/day.
- Jäger R et al. (2017), _ISSN Position Stand: protein and exercise_, JISSN —
  1.4–2.0 g/kg/day for exercising individuals.
- Helms ER, Zinn C, Rowlands DS, Brown SR (2014), _A systematic review of
  dietary protein during caloric restriction in resistance trained lean
  athletes: a case for higher intakes_, IJSNEM — higher protein in a deficit;
  and Helms et al. (2014) natural-bodybuilding contest-prep recommendations —
  0.5–1%/week muscle-sparing weight loss.
- Mifflin MD, St Jeor ST et al. (1990) predictive RMR equation; Katch & McArdle
  lean-mass RMR equation — validated BMR estimators (Mifflin–St Jeor within 10%
  for ~71–82% of adults; ~26% RMR variance is unexplained by any equation).

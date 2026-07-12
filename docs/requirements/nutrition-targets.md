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

## Surfaces

- **Today / day page** (`NutritionCard`): daily kcal + per-macro grams and
  shares for that day's phase, with the phase name and override indicators.
  Shown on every program day (rest days included — the plan prescribes eating
  for the week, not just workout days); hidden on gap days and outside the
  program, where no phase exists.
- **Settings → Nutrition**: the derived read-outs (energy amount, level, daily
  target), the two overrides, and the three-phase split table with gram targets
  at the effective daily calories.

Not medical or dietetic advice — the numbers are the program guide's, shown for
parity with the boxed product.

## Sources

- P90X Nutrition Plan (official guide PDF, "nutrition plan EATING FOR POWER
  PERFORMANCE"), Beachbody — level chart p. 5, phase splits pp. 6–7.
- Secondary confirmations of the same tables:
  [90dayworkoutplan.com/about/p90x-nutrition-plan](https://www.90dayworkoutplan.com/about/p90x-nutrition-plan/),
  [travelingworkout.wordpress.com/p90x-nutrition-guide](https://travelingworkout.wordpress.com/p90x-nutrition-guide/).

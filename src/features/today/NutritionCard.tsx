import { Link } from 'react-router-dom'
import { Card } from '@/components/Page'
import { todayISO } from '@/lib/dates'
import {
  nutritionTargets,
  targetNutritionFromState,
  type NutritionGoal,
  type NutritionPhase,
} from '@/lib/nutrition'
import { useBodyLog, useSettings } from '@/state/selectors'
import { Chip, type ChipTone } from '@/features/schedule/Chip'

const kcal = (value: number) => Math.round(value).toLocaleString('en-US')

const GOAL_LABEL: Record<NutritionGoal, string> = {
  deficit: 'Fat loss',
  surplus: 'Muscle gain',
  recomp: 'Recomp',
  maintenance: 'Maintain',
}
const GOAL_TONE: Record<NutritionGoal, ChipTone> = {
  deficit: 'amber',
  surplus: 'green',
  recomp: 'green',
  maintenance: 'zinc',
}

/** Signed weekly pace, e.g. "−0.48" / "+0.40". */
const pace = (kg: number) => `${kg < 0 ? '−' : '+'}${Math.abs(kg).toFixed(2)}`

function Macro({ label, grams, detail }: { label: string; grams: number; detail: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-semibold tabular-nums">
        {Math.round(grams)}
        <span className="ml-0.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">g</span>
        <span className="ml-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
          {detail}
        </span>
      </dd>
    </div>
  )
}

/**
 * E22: the day's nutrition targets. Two clearly-labelled layers:
 *  · P90X plan — the boxed program's level calories + phase macro split.
 *  · Your target — an evidence-based recommendation (TDEE + goal-adjusted
 *    calories, g/kg macros) derived from your target weight and the remaining
 *    program window. Shown on every program day; rest days included.
 */
export function NutritionCard({ schedulePhase }: { schedulePhase: NutritionPhase }) {
  const settings = useSettings()
  const bodyLog = useBodyLog()
  const plan = nutritionTargets(settings, bodyLog, schedulePhase)
  const target = targetNutritionFromState(settings, bodyLog, todayISO())
  const usedLatestWeigh = bodyLog.some((e) => e.weight != null)

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Nutrition</h2>
      </div>

      {/* P90X program plan */}
      <section aria-label="P90X plan" className="mt-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            P90X plan
          </span>
          {plan !== null ? (
            <>
              <Chip tone="zinc">
                Phase {plan.phase} · {plan.phaseName}
              </Chip>
              {plan.phaseOverridden ? <Chip tone="amber">phase override</Chip> : null}
            </>
          ) : null}
        </div>
        {plan === null ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Log a weigh-in or set your start weight in{' '}
            <Link to="/more/settings" className="font-medium text-red-600 hover:underline">
              Settings
            </Link>{' '}
            to get your daily calorie and macro targets.
          </p>
        ) : (
          <>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {kcal(plan.calories)}
              <span className="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                kcal/day{plan.calorieOverridden ? ' · custom' : ''}
              </span>
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <Macro
                label="Protein"
                grams={plan.grams.protein}
                detail={`${Math.round(plan.split.protein * 100)}%`}
              />
              <Macro
                label="Carbs"
                grams={plan.grams.carbs}
                detail={`${Math.round(plan.split.carbs * 100)}%`}
              />
              <Macro
                label="Fat"
                grams={plan.grams.fat}
                detail={`${Math.round(plan.split.fat * 100)}%`}
              />
            </dl>
            <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              {plan.calorieOverridden
                ? 'Custom daily calories from Settings'
                : plan.energy !== null && plan.level !== null
                  ? `P90X nutrition plan · Level ${plan.level} (energy amount ≈ ${kcal(plan.energy)} kcal from your ${usedLatestWeigh ? 'latest weigh-in' : 'start weight'})`
                  : 'P90X nutrition plan'}
            </p>
          </>
        )}
      </section>

      {/* Evidence-based, target-driven recommendation */}
      <section
        aria-label="Your target"
        className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Your target
          </span>
          {target !== null ? (
            <>
              <Chip tone={GOAL_TONE[target.goal]}>{GOAL_LABEL[target.goal]}</Chip>
              {target.dietStyle === 'lowCarb' ? <Chip tone="zinc">low-carb</Chip> : null}
              {target.rateClamped ? <Chip tone="amber">pace capped</Chip> : null}
            </>
          ) : null}
        </div>
        {target === null ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Set a body target (lean-mass increase, body-fat % or FFMI) plus your start body-fat in{' '}
            <Link to="/more/settings" className="font-medium text-red-600 hover:underline">
              Settings
            </Link>{' '}
            to see calories & macros tuned to your goal.
          </p>
        ) : (
          <>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {kcal(target.calories)}
              <span className="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                kcal/day
              </span>
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <Macro
                label="Protein"
                grams={target.protein}
                detail={`${target.proteinPerKg} g/kg`}
              />
              <Macro
                label="Carbs"
                grams={target.carbs}
                detail={target.carbsCapped ? 'capped' : 'fill'}
              />
              <Macro label="Fat" grams={target.fat} detail={`${target.fatPerKg} g/kg`} />
            </dl>
            <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              Evidence-based · {target.bmrMethod === 'katch' ? 'Katch–McArdle' : 'Mifflin–St Jeor'}{' '}
              TDEE ≈ {kcal(target.tdee)} kcal
              {target.goal === 'maintenance'
                ? ' · already at your body target'
                : target.goal === 'recomp'
                  ? `, ${pace(target.weeklyFatKg)} kg/wk fat · ${pace(target.weeklyLeanKg)} kg/wk lean`
                  : `, ${pace(target.weeklyRateKg)} kg/wk to reach target`}
              {target.rateClamped ? ' (capped to a muscle-sparing pace)' : ''}
              {target.caloriesFloored ? ' · floored at BMR' : ''} · not medical advice ·{' '}
              <Link to="/more/settings" className="font-medium hover:underline">
                details
              </Link>
            </p>
          </>
        )}
      </section>
    </Card>
  )
}

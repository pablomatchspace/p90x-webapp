import { Link } from 'react-router-dom'
import { Card } from '@/components/Page'
import { Chip } from '@/features/schedule/Chip'
import { nutritionTargets, type NutritionPhase } from '@/lib/nutrition'
import { useBodyLog, useSettings } from '@/state/selectors'

const kcal = (value: number) => Math.round(value).toLocaleString('en-US')

function Macro({ label, grams, share }: { label: string; grams: number; share: number }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-semibold tabular-nums">
        {Math.round(grams)}
        <span className="ml-0.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">g</span>
        <span className="ml-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
          {Math.round(share * 100)}%
        </span>
      </dd>
    </div>
  )
}

/**
 * E22: the day's P90X nutrition-plan target — daily calories from the guide's
 * level chart (or the custom override) split into macro grams by the day's
 * nutrition phase. Rendered on every program day, rest days included: the plan
 * prescribes eating targets for the whole week, not just workout days.
 */
export function NutritionCard({ schedulePhase }: { schedulePhase: NutritionPhase }) {
  const settings = useSettings()
  const bodyLog = useBodyLog()
  const targets = nutritionTargets(settings, bodyLog, schedulePhase)

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Nutrition</h2>
        {targets !== null ? (
          <span className="flex flex-wrap items-center gap-1.5">
            <Chip tone="zinc">
              Phase {targets.phase} · {targets.phaseName}
            </Chip>
            {targets.phaseOverridden ? <Chip tone="amber">phase override</Chip> : null}
          </span>
        ) : null}
      </div>

      {targets === null ? (
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
            {kcal(targets.calories)}
            <span className="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">
              kcal/day{targets.calorieOverridden ? ' · custom' : ''}
            </span>
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <Macro label="Protein" grams={targets.grams.protein} share={targets.split.protein} />
            <Macro label="Carbs" grams={targets.grams.carbs} share={targets.split.carbs} />
            <Macro label="Fat" grams={targets.grams.fat} share={targets.split.fat} />
          </dl>
          <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            {targets.calorieOverridden
              ? 'Custom daily calories from Settings'
              : targets.energy !== null && targets.level !== null
                ? `P90X nutrition plan · Level ${targets.level} (energy amount ≈ ${kcal(targets.energy)} kcal from your ${bodyLog.some((e) => e.weight != null) ? 'latest weigh-in' : 'start weight'})`
                : 'P90X nutrition plan'}
            {' · adjust in '}
            <Link to="/more/settings" className="font-medium hover:underline">
              Settings
            </Link>
          </p>
        </>
      )}
    </Card>
  )
}

import { type ReactNode, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card, Page } from '@/components/Page'
import { Chip } from '@/features/schedule/Chip'
import { NumberField } from '@/features/workouts/NumberField'
import {
  deriveBody,
  formatFixed,
  ffmiCategory,
  fractionToPercent,
  heightUnit,
  kgToUnit,
  mToUnit,
  percentToFraction,
  unitToKg,
  unitToM,
  weightUnit,
} from '@/lib/body'
import { diffDays, formatLong, todayISO } from '@/lib/dates'
import {
  assessFatLoss,
  assessLeanGain,
  ceilingStatus,
  recompFlag,
  suggestedTarget,
} from '@/lib/feasibility'
import { normalizedFfmi, planFromFfmi } from '@/lib/ffmi'
import {
  currentWeightKg,
  energyAmount,
  LEVEL_CALORIES,
  macroGrams,
  nutritionLevel,
  PHASE_NAMES,
  PHASE_SPLITS,
  type NutritionPhase,
} from '@/lib/nutrition'
import { getTemplate, getWorkout, type ProgramKey } from '@/lib/programData'
import { setupDerived, settingsWarnings } from '@/lib/setup'
import {
  setStartDate,
  updateLimits,
  updateNutrition,
  updateScoring,
  updateSettings,
  updateTargets,
  updateTraining,
  updateYogaVariant,
} from '@/state/actions'
import { useBodyLog, useSchedule, useSettings } from '@/state/selectors'
import { useStore } from '@/state/store'

/**
 * A labelled settings row: text on top, control below on narrow (mobile)
 * viewports; side by side from the `sm` breakpoint up. Consistent single-column
 * stacking avoids squeezing the label into an unreadable sliver next to a wide
 * control (E20 mobile legibility fix).
 */
function Row({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="min-w-0 sm:flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint ? (
          <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</div>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/** A compact segmented toggle for enum settings (units, gender, penalty on/off). */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-700"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.value
              ? 'bg-red-600 text-white'
              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** A read-only derived stat tile (LBM, BMI, target weight…). */
function Derived({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-semibold tabular-nums">
        {value}
        {unit && value !== '—' && value !== 'CHECK VALUES!' ? (
          <span className="ml-0.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
            {unit}
          </span>
        ) : null}
      </dd>
    </div>
  )
}

const VERDICT_TONE = {
  realistic: 'green',
  aggressive: 'amber',
  unrealistic: 'rose',
} as const

const RECOMP_TONE = {
  'not-applicable': 'zinc',
  ok: 'green',
  harder: 'amber',
  unlikely: 'rose',
} as const

/** Compare one published model's window band against the plan's required gain. */
function GainModelBar({
  label,
  low,
  high,
  required,
  unit,
}: {
  label: string
  low: number
  high: number
  required: number
  unit: string
}) {
  const scale = Math.max(required, high, 0.1) * 1.1
  const lowPct = Math.max(0, (low / scale) * 100)
  const widthPct = Math.max(1, ((high - low) / scale) * 100)
  const requiredPct = Math.max(0, Math.min(100, (required / scale) * 100))
  return (
    <div
      aria-label={`${label}: ${formatFixed(low, 2)}–${formatFixed(high, 2)} ${unit}; ${formatFixed(required, 2)} ${unit} required`}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
          {formatFixed(low, 2)}–{formatFixed(high, 2)} {unit} <Chip tone="zinc">Tier B</Chip>
        </span>
      </div>
      <div className="relative mt-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800">
        <span
          className="absolute top-0 h-2 rounded-full bg-sky-500"
          style={{ left: `${lowPct}%`, width: `${widthPct}%` }}
        />
        <span
          className="absolute -top-1 h-4 w-0.5 bg-red-600"
          style={{ left: `${requiredPct}%` }}
          title="Required gain"
        />
      </div>
    </div>
  )
}
const NUTRITION_PHASES: NutritionPhase[] = [1, 2, 3]

export function SettingsPage() {
  const settings = useSettings()
  const bodyLog = useBodyLog()
  const schedule = useSchedule()
  const hasData = useStore(
    (s) =>
      s.data.bodyLog.length > 0 ||
      s.data.scheduleOps.length > 0 ||
      Object.values(s.data.workoutLogs).some((log) => log.sessions.length > 0),
  )
  // null = no dialog; { value } holds the candidate start date (value null = clear)
  const [pendingStart, setPendingStart] = useState<{ value: string | null } | null>(null)
  const [pendingProgram, setPendingProgram] = useState<ProgramKey | null>(null)
  // FFMI estimator drafts (E14) — FFMI as-is, body-fat as display percent
  const [ffmiDraft, setFfmiDraft] = useState<number | null>(settings.targets.ffmi ?? null)
  const [bfDraft, setBfDraft] = useState<number | null>(
    fractionToPercent(settings.targets.bodyFat ?? null),
  )
  const [pendingFfmi, setPendingFfmi] = useState(false)

  const units = settings.units
  const wUnit = weightUnit(units)
  const derived = setupDerived(settings)
  const warnings = settingsWarnings(settings)
  // E14: everything below derives live from the two drafts + start stats. The
  // applied lean-mass increase is the HONEST one (option A): implied lean minus
  // start lean; the sheet's quirky target-weight formula stays the oracle and
  // both weights are shown side by side.
  const ffmiPlan =
    ffmiDraft === null || bfDraft === null || settings.height == null || derived.startLean === null
      ? null
      : planFromFfmi(
          ffmiDraft,
          percentToFraction(bfDraft) ?? NaN,
          settings.height,
          derived.startLean,
        )

  // E20 always compares the plan with the latest complete weigh-in; start stats
  // remain the honest fallback when no complete body-log entry exists yet.
  const latestWeighIn =
    [...bodyLog].reverse().find((entry) => entry.weight != null && entry.bodyFat != null) ?? null
  const latestDerived = latestWeighIn === null ? null : deriveBody(latestWeighIn, settings)
  const startFfmi =
    derived.startLean !== null && settings.height != null
      ? normalizedFfmi(derived.startLean, settings.height)
      : null
  const baseline =
    latestWeighIn !== null &&
    latestDerived !== null &&
    latestWeighIn.weight != null &&
    latestWeighIn.bodyFat != null &&
    latestDerived.leanMass !== null &&
    latestDerived.ffmi !== null
      ? {
          lean: latestDerived.leanMass,
          weight: latestWeighIn.weight,
          bodyFat: latestWeighIn.bodyFat,
          ffmi: latestDerived.ffmi,
          date: latestWeighIn.date,
          source: 'latest' as const,
        }
      : derived.startLean !== null &&
          settings.startWeight != null &&
          settings.startBodyFat != null &&
          startFfmi !== null
        ? {
            lean: derived.startLean,
            weight: settings.startWeight,
            bodyFat: settings.startBodyFat,
            ffmi: startFfmi,
            date: settings.startDate,
            source: 'start' as const,
          }
        : null

  // A finished program gets a fresh 90-day planning block; future starts and
  // missing dates never inflate the comparison beyond one program window.
  const rawRemainingDays =
    settings.startDate === null ? 90 : 90 - diffDays(settings.startDate, todayISO())
  const freshBlock = settings.startDate !== null && rawRemainingDays <= 0
  const horizonDays = freshBlock ? 90 : Math.min(90, Math.max(0, rawRemainingDays))
  const months = horizonDays / 30
  const weeks = horizonDays / 7

  const feasibility = (() => {
    if (
      ffmiPlan === null ||
      baseline === null ||
      ffmiDraft === null ||
      bfDraft === null ||
      settings.height == null
    ) {
      return null
    }
    const targetBf = percentToFraction(bfDraft)
    if (targetBf === null) return null
    const lean = assessLeanGain(
      ffmiPlan.lean - baseline.lean,
      months,
      settings.training,
      settings.gender,
      baseline.weight,
    )
    const fat = assessFatLoss(baseline.weight, baseline.bodyFat, ffmiPlan.weight, targetBf, weeks)
    if (fat === null) return null
    return {
      lean,
      fat,
      recomp: recompFlag(
        lean.requiredGainKg > 0,
        fat.fatLossKg > 0,
        settings.training,
        baseline.bodyFat,
      ),
      ceiling: ceilingStatus(ffmiDraft, settings.gender),
      suggestion: suggestedTarget(
        baseline.lean,
        settings.height,
        settings.training,
        settings.gender,
        baseline.weight,
        months,
        baseline.ffmi,
        normalizedFfmi,
      ),
    }
  })()

  function applyFfmiTargets() {
    if (ffmiPlan === null || ffmiDraft === null || bfDraft === null) return
    updateTargets({
      leanMassIncrease: ffmiPlan.increase,
      bodyFat: percentToFraction(bfDraft),
      ffmi: ffmiDraft,
    })
    setPendingFfmi(false)
  }

  // E22: nutrition-plan read-outs — derived live, only the two overrides are stored.
  const nutritionWeight = currentWeightKg(settings, bodyLog)
  const energy = nutritionWeight !== null ? energyAmount(nutritionWeight) : null
  const level = energy !== null ? nutritionLevel(energy) : null
  const dailyCalories =
    settings.nutrition.calorieOverride ?? (level !== null ? LEVEL_CALORIES[level] : null)
  const todayDay = schedule?.byDate.get(todayISO())
  const todayPhase: NutritionPhase | null =
    todayDay !== undefined && todayDay.kind === 'program' ? todayDay.phase : null
  const activePhase = settings.nutrition.phaseOverride ?? todayPhase
  const showKcal = (value: number | null) =>
    value === null ? '—' : Math.round(value).toLocaleString('en-US')

  const showWeight = (kg: number | null) =>
    kg === null ? '—' : formatFixed(kgToUnit(kg, units), 1)
  // The Reality check panel shows finer precision than the stat tiles above.
  const showKg = (kg: number, dp = 2) => formatFixed(kgToUnit(kg, units), dp)

  function onDateInput(raw: string) {
    const next = raw === '' ? null : raw
    if (next === settings.startDate) return
    if (settings.startDate !== null && hasData) {
      setPendingStart({ value: next })
    } else {
      setStartDate(next)
    }
  }

  function applyPending() {
    if (pendingStart) setStartDate(pendingStart.value)
    setPendingStart(null)
  }

  const shiftDays =
    pendingStart?.value && settings.startDate ? diffDays(settings.startDate, pendingStart.value) : 0

  // Program variant (US-073). Switching only changes the workout on each day; the
  // calendar, rest days and every reschedule op are identical between variants, so
  // the ops replay unchanged and logged sessions are kept. A confirm guards a switch
  // once data exists.
  const otherProgram: ProgramKey = settings.program === 'classic' ? 'lean' : 'classic'
  const day1Of = (program: ProgramKey) =>
    getTemplate(program)[0]
      .workouts.map((key) => getWorkout(key).name)
      .join(' + ')

  function switchProgram(next: ProgramKey) {
    if (hasData) setPendingProgram(next)
    else updateSettings({ program: next })
  }
  function applyProgram() {
    if (pendingProgram) updateSettings({ program: pendingProgram })
    setPendingProgram(null)
  }

  return (
    <Page
      title="Settings"
      subtitle="Your stats, targets, units and scoring rules — all stored on this device"
    >
      {/* Program & start date */}
      <Card>
        <h2 className="text-base font-semibold">Program</h2>
        <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          <Row
            label="Variant"
            hint={
              settings.program === 'classic'
                ? 'Classic rotation — switch to Lean for more cardio, less resistance'
                : 'Lean rotation (Cardio X + Core Synergistics Lean) — switch back anytime'
            }
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold capitalize">{settings.program}</span>
              <button
                type="button"
                onClick={() => switchProgram(otherProgram)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Switch to <span className="capitalize">{otherProgram}</span>
              </button>
            </div>
          </Row>
          <Row
            label="Yoga timeline"
            hint="Choose the default timeline that plays on Yoga X days — can be overridden per session"
          >
            <Segmented
              label="Yoga timeline"
              value={settings.yoga}
              options={[
                { value: 'classic', label: 'Classic (90 min)' },
                { value: 'x3', label: 'P90X3 (30 min)' },
              ]}
              onChange={(value) => updateYogaVariant(value)}
            />
          </Row>
          <Row
            label="Start date"
            hint={
              settings.startDate
                ? `Day 1 is ${formatLong(settings.startDate)}`
                : 'Set the date of your first workout to build the schedule'
            }
          >
            <input
              type="date"
              aria-label="Start date"
              value={settings.startDate ?? ''}
              onChange={(e) => onDateInput(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </Row>
        </div>
      </Card>

      {/* Units & gender */}
      <Card>
        <h2 className="text-base font-semibold">Units</h2>
        <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          <Row
            label="Measurement units"
            hint="Weights and heights re-display instantly; stored values never change"
          >
            <Segmented
              label="Units"
              value={units}
              options={[
                { value: 'metric', label: 'Metric' },
                { value: 'imperial', label: 'Imperial' },
              ]}
              onChange={(value) => updateSettings({ units: value })}
            />
          </Row>
          <Row label="Gender" hint="Used by the body-fat calculators">
            <Segmented
              label="Gender"
              value={settings.gender}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ]}
              onChange={(value) => updateSettings({ gender: value })}
            />
          </Row>
          <Row
            label="Training experience"
            hint="Years spent regularly lifting weights or doing resistance workouts before this program — Novice under 1 year, Intermediate 1–3 years, Advanced 3+ years. Sets the realistic muscle-gain rates in the FFMI feasibility check."
          >
            <Segmented
              label="Training experience"
              value={settings.training}
              options={[
                { value: 'novice', label: 'Novice' },
                { value: 'intermediate', label: 'Interm.' },
                { value: 'advanced', label: 'Advanced' },
              ]}
              onChange={(value) => updateTraining(value)}
            />
          </Row>
        </div>
      </Card>

      {/* Start stats + derived */}
      <Card>
        <h2 className="text-base font-semibold">Your stats</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Your day-1 baseline. Everything below the line is derived and updates live.
        </p>
        <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          <Row label="Age">
            <NumberField
              label="Age"
              value={settings.age ?? null}
              step={1}
              onChange={(value) => updateSettings({ age: value })}
            />
          </Row>
          <Row label={`Height (${heightUnit(units)})`}>
            <NumberField
              label={`Height (${heightUnit(units)})`}
              value={settings.height == null ? null : mToUnit(settings.height, units)}
              step={units === 'imperial' ? 0.5 : 0.01}
              onChange={(value) =>
                updateSettings({ height: value === null ? null : unitToM(value, units) })
              }
            />
          </Row>
          <Row label={`Start weight (${wUnit})`}>
            <NumberField
              label={`Start weight (${wUnit})`}
              value={settings.startWeight == null ? null : kgToUnit(settings.startWeight, units)}
              step={units === 'imperial' ? 1 : 0.5}
              onChange={(value) =>
                updateSettings({ startWeight: value === null ? null : unitToKg(value, units) })
              }
            />
          </Row>
          <Row label="Start body-fat (%)">
            <NumberField
              label="Start body-fat (%)"
              value={fractionToPercent(settings.startBodyFat ?? null)}
              step={0.5}
              onChange={(value) => updateSettings({ startBodyFat: percentToFraction(value) })}
            />
          </Row>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <Derived label="Lean mass" value={showWeight(derived.startLean)} unit={wUnit} />
          <Derived label="Fat mass" value={showWeight(derived.startFat)} unit={wUnit} />
          <Derived label="BMI" value={formatFixed(derived.startBmi, 1)} />
        </dl>
      </Card>

      {/* Targets & limits + derived */}
      <Card>
        <h2 className="text-base font-semibold">Targets &amp; limits</h2>
        <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          <Row
            label={`Lean-mass increase (${wUnit})`}
            hint="Muscle you aim to add over the 90 days"
          >
            <NumberField
              label={`Lean-mass increase (${wUnit})`}
              value={
                settings.targets.leanMassIncrease == null
                  ? null
                  : kgToUnit(settings.targets.leanMassIncrease, units)
              }
              step={units === 'imperial' ? 1 : 0.5}
              onChange={(value) =>
                updateTargets({
                  leanMassIncrease: value === null ? null : unitToKg(value, units),
                })
              }
            />
          </Row>
          <Row label="Target body-fat (%)">
            <NumberField
              label="Target body-fat (%)"
              value={fractionToPercent(settings.targets.bodyFat ?? null)}
              step={0.5}
              onChange={(value) => updateTargets({ bodyFat: percentToFraction(value) })}
            />
          </Row>
          <Row label={`Upper weight limit (${wUnit})`}>
            <NumberField
              label={`Upper weight limit (${wUnit})`}
              value={
                settings.limits.weight == null ? null : kgToUnit(settings.limits.weight, units)
              }
              step={units === 'imperial' ? 1 : 0.5}
              onChange={(value) =>
                updateLimits({ weight: value === null ? null : unitToKg(value, units) })
              }
            />
          </Row>
          <Row label="Upper body-fat limit (%)">
            <NumberField
              label="Upper body-fat limit (%)"
              value={fractionToPercent(settings.limits.bodyFat ?? null)}
              step={0.5}
              onChange={(value) => updateLimits({ bodyFat: percentToFraction(value) })}
            />
          </Row>
          <Row label="Upper BMI limit">
            <NumberField
              label="Upper BMI limit"
              value={settings.limits.bmi ?? null}
              step={0.5}
              onChange={(value) => updateLimits({ bmi: value })}
            />
          </Row>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <Derived
            label="Target weight"
            value={
              derived.targetWeight === null ? 'CHECK VALUES!' : showWeight(derived.targetWeight)
            }
            unit={wUnit}
          />
          <Derived label="Target BMI" value={formatFixed(derived.targetBmi, 1)} />
        </dl>
        <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <h3 className="text-sm font-semibold">Estimate from FFMI</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Pick a normalized-FFMI goal and a plan body-fat; applying writes the target inputs above
            and stores the FFMI target for the dashboard. Uses the workbook&rsquo;s 6.1
            normalization at 1.8 m.
          </p>
          <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
            <Row
              label="Target FFMI (normalized)"
              hint={
                ffmiDraft !== null
                  ? `Category: ${ffmiCategory(ffmiDraft)}`
                  : 'e.g. 20–22 = Above Average'
              }
            >
              <NumberField
                label="Target FFMI (normalized)"
                value={ffmiDraft}
                step={0.1}
                onChange={setFfmiDraft}
              />
            </Row>
            <Row label="FFMI plan body-fat (%)">
              <NumberField
                label="FFMI plan body-fat (%)"
                value={bfDraft}
                step={0.5}
                onChange={setBfDraft}
              />
            </Row>
          </div>
          {ffmiPlan !== null ? (
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Derived label="Lean mass (plan)" value={showWeight(ffmiPlan.lean)} unit={wUnit} />
              <Derived
                label="Lean gain"
                value={`${ffmiPlan.increase >= 0 ? '+' : ''}${formatFixed(
                  kgToUnit(ffmiPlan.increase, units),
                  1,
                )}`}
                unit={wUnit}
              />
              <Derived label="Implied weight" value={showWeight(ffmiPlan.weight)} unit={wUnit} />
              <Derived
                label="Sheet target (plan)"
                value={showWeight(ffmiPlan.sheetTargetWeight)}
                unit={wUnit}
              />
            </dl>
          ) : (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Set height, start weight and start body-fat (plus both fields above) to see the plan.
            </p>
          )}
          <button
            type="button"
            disabled={ffmiPlan === null}
            onClick={() => setPendingFfmi(true)}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            Apply as targets
          </button>
        </div>
        {feasibility !== null && baseline !== null ? (
          <section
            aria-label="Reality check"
            className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Reality check</h3>
              <Chip tone={freshBlock ? 'amber' : 'zinc'}>
                {freshBlock ? 'Program complete — fresh 90-day block' : `${horizonDays} days left`}
              </Chip>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {baseline.source === 'latest'
                ? `Latest weigh-in · ${formatLong(baseline.date)}`
                : baseline.date !== null
                  ? `From your start stats · ${formatLong(baseline.date)}`
                  : 'From your start stats'}
            </p>

            {/* Product policy ranks fat-loss feasibility before lean-gain feasibility. */}
            <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold">Fat-loss pace</h4>
                <Chip tone={VERDICT_TONE[feasibility.fat.verdict]}>{feasibility.fat.verdict}</Chip>
                <Chip tone="zinc">Tier A</Chip>
              </div>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                {feasibility.fat.fatLossKg <= 0
                  ? 'No fat-mass loss required by this plan.'
                  : feasibility.fat.weeklyPctBw > 0
                    ? `${showKg(feasibility.fat.fatLossKg)} ${wUnit} fat loss · ${formatFixed(
                        feasibility.fat.weeklyPctBw * 100,
                        2,
                      )}% bodyweight/week required`
                    : `${showKg(feasibility.fat.fatLossKg)} ${wUnit} fat loss while body weight holds or rises (recomp) — Helms' weekly pace limit doesn't apply.`}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                Muscle-sparing reference band: 0.5–1% bodyweight/week (Helms).
              </p>
            </div>

            {/* Both Tier-B models stay visible together; no selector hides either result. */}
            <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold">Muscle-gain pace</h4>
                <Chip tone={VERDICT_TONE[feasibility.lean.verdict]}>
                  {feasibility.lean.verdict}
                </Chip>
                <Chip tone="zinc">Tier B</Chip>
              </div>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                {showKg(feasibility.lean.requiredGainKg)} {wUnit} required ·{' '}
                {showKg(feasibility.lean.requiredPaceKgPerMonth)} {wUnit}/month
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <GainModelBar
                  label="Aragon %BW model"
                  low={kgToUnit(feasibility.lean.models.aragon.maxGain.low, units)}
                  high={kgToUnit(feasibility.lean.models.aragon.maxGain.high, units)}
                  required={kgToUnit(Math.max(0, feasibility.lean.requiredGainKg), units)}
                  unit={wUnit}
                />
                <GainModelBar
                  label="Lyle absolute model"
                  low={kgToUnit(feasibility.lean.models.lyle.maxGain.low, units)}
                  high={kgToUnit(feasibility.lean.models.lyle.maxGain.high, units)}
                  required={kgToUnit(Math.max(0, feasibility.lean.requiredGainKg), units)}
                  unit={wUnit}
                />
              </div>
              <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                Blue = published model range for this window · red marker = required gain.
              </p>
            </div>

            {/* Recomp and ceiling flags qualify the pace verdicts without blocking the target. */}
            <div className="mt-3 flex flex-wrap gap-2">
              {feasibility.recomp !== 'not-applicable' ? (
                <Chip tone={RECOMP_TONE[feasibility.recomp]}>Recomp: {feasibility.recomp}</Chip>
              ) : null}
              <Chip tone={feasibility.ceiling.withinLimit ? 'green' : 'rose'}>
                Ceiling: {feasibility.ceiling.withinLimit ? 'within' : 'over limit'}
              </Chip>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Approx. {formatFixed(feasibility.ceiling.ceiling, 1)} normalized FFMI{' '}
                <Chip tone="zinc">Tier A/A−</Chip>
              </span>
            </div>
            {feasibility.recomp !== 'not-applicable' ? (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Simultaneous fat loss and lean gain is harder, not impossible (Barakat).
              </p>
            ) : null}

            {/* The conservative model overlap can replace only the local estimator draft. */}
            {feasibility.suggestion !== null ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sky-50 p-3 dark:bg-sky-950/30">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    Suggested target: {formatFixed(feasibility.suggestion.ffmi, 1)}
                    <Chip tone="zinc">Tier B</Chip>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    Conservative gain: {showKg(feasibility.suggestion.gainKg)} {wUnit}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFfmiDraft(feasibility.suggestion?.ffmi ?? null)}
                  className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800"
                >
                  Use realistic target
                </button>
              </div>
            ) : null}

            {/* Disclose concurrent-training uncertainty without inventing a discount multiplier. */}
            <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              Concurrent endurance and resistance work can blunt strength and hypertrophy responses
              (Wilson); no discount multiplier is applied. Not medical or coaching advice.
            </p>
          </section>
        ) : null}
        {warnings.length > 0 && (
          <ul
            role="alert"
            className="mt-3 space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
          >
            {warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {warning}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* E22: P90X nutrition plan — level, daily calories, per-phase macro split */}
      <Card>
        <h2 className="text-base font-semibold">Nutrition</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          The P90X nutrition plan&rsquo;s daily calorie target, from your latest weigh-in (start
          weight until you log one): weight (lb) × 10 resting burn, plus 20% daily activity, plus
          600 kcal for the workout — then the level chart picks the plan. Today&rsquo;s card shows
          the phase&rsquo;s macro grams.
        </p>
        <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          <Row
            label="Nutrition phase"
            hint="Auto follows the training blocks (weeks 1–4 / 5–8 / 9–13); pin a phase to stay in it longer, as the guide allows"
          >
            <Segmented
              label="Nutrition phase"
              value={
                settings.nutrition.phaseOverride === null
                  ? 'auto'
                  : String(settings.nutrition.phaseOverride)
              }
              options={[
                { value: 'auto', label: 'Auto' },
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
              ]}
              onChange={(value) =>
                updateNutrition({
                  phaseOverride: value === 'auto' ? null : (Number(value) as NutritionPhase),
                })
              }
            />
          </Row>
          <Row
            label="Custom daily calories (kcal)"
            hint="Replaces the level plan — leave empty to follow the level chart"
          >
            <NumberField
              label="Custom daily calories (kcal)"
              value={settings.nutrition.calorieOverride ?? null}
              step={50}
              onChange={(value) => updateNutrition({ calorieOverride: value })}
            />
          </Row>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <Derived label="Energy amount" value={showKcal(energy)} unit="kcal" />
          <Derived label="Level" value={level ?? '—'} />
          <Derived
            label="Daily target"
            value={showKcal(dailyCalories)}
            unit={settings.nutrition.calorieOverride !== null ? 'kcal · custom' : 'kcal'}
          />
        </dl>
        {dailyCalories !== null ? (
          <ul className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            {NUTRITION_PHASES.map((phase) => {
              const split = PHASE_SPLITS[phase]
              const grams = macroGrams(dailyCalories, phase)
              return (
                <li
                  key={phase}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">
                      Phase {phase} · {PHASE_NAMES[phase]}
                    </span>
                    {activePhase === phase ? <Chip tone="green">current</Chip> : null}
                  </span>
                  <span className="tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                    {Math.round(split.protein * 100)}/{Math.round(split.carbs * 100)}/
                    {Math.round(split.fat * 100)} · {Math.round(grams.protein)} g protein ·{' '}
                    {Math.round(grams.carbs)} g carbs · {Math.round(grams.fat)} g fat
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Set your start weight (or log a weigh-in) to derive the calorie level, or enter custom
            daily calories.
          </p>
        )}
      </Card>

      {/* Scoring engine */}
      <Card>
        <h2 className="text-base font-semibold">Scoring</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          The workbook&rsquo;s SETUP scoring cells. Divisors must stay above zero.
        </p>
        <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          <Row label="Round-drop penalty" hint="Penalise a drop from round 1 to round 2">
            <Segmented
              label="Penalty"
              value={settings.scoring.penaltyOn ? 'on' : 'off'}
              options={[
                { value: 'on', label: 'On' },
                { value: 'off', label: 'Off' },
              ]}
              onChange={(value) => updateScoring({ penaltyOn: value === 'on' })}
            />
          </Row>
          <Row label="Penalty divisor" hint="Divide the round 1→2 drop by this">
            <NumberField
              label="Penalty divisor"
              value={settings.scoring.penaltyDivisor}
              step={0.5}
              onChange={(value) => value !== null && updateScoring({ penaltyDivisor: value })}
            />
          </Row>
          <Row label="Chair-assist factor" hint="Knee / chair reps count as 1 ÷ this">
            <NumberField
              label="Chair-assist factor"
              value={settings.scoring.chairFactor}
              step={0.5}
              onChange={(value) => value !== null && updateScoring({ chairFactor: value })}
            />
          </Row>
          <Row label="Reps×weight divisor" hint="Cosmetic divisor for R×W chart values">
            <NumberField
              label="Reps×weight divisor"
              value={settings.scoring.rwDivisor}
              step={1}
              onChange={(value) => value !== null && updateScoring({ rwDivisor: value })}
            />
          </Row>
        </div>
      </Card>

      {/* Start-date re-anchor confirm */}
      {pendingStart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm start date change"
        >
          <Card className="max-w-md">
            <h2 className="text-base font-semibold">Move your start date?</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {pendingStart.value === null ? (
                <>Clearing the start date removes the whole schedule until you set a new one.</>
              ) : (
                <>
                  Day 1 moves to{' '}
                  <span className="font-medium">{formatLong(pendingStart.value)}</span>, which
                  re-anchors the entire program — every scheduled workout shifts{' '}
                  <span className="font-medium">
                    {Math.abs(shiftDays)} day{Math.abs(shiftDays) === 1 ? '' : 's'}{' '}
                    {shiftDays >= 0 ? 'later' : 'earlier'}
                  </span>
                  .
                </>
              )}{' '}
              Your logged sessions stay attached to their program day; date-specific reschedule
              tweaks may need a second look.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={applyPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                {pendingStart.value === null ? 'Clear start date' : 'Move start date'}
              </button>
              <button
                type="button"
                onClick={() => setPendingStart(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Program variant re-anchor confirm (US-073) */}
      {pendingProgram && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm program variant"
        >
          <Card className="max-w-md">
            <h2 className="text-base font-semibold">
              Switch to <span className="capitalize">{pendingProgram}</span>?
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Your start date, rest days and every reschedule adjustment stay exactly the same —
              only the workout on each day changes to the{' '}
              <span className="capitalize">{pendingProgram}</span> rotation (day 1 becomes{' '}
              <span className="font-medium">{day1Of(pendingProgram)}</span>). Logged sessions are
              kept and reappear if you switch back.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={applyProgram}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Switch to <span className="capitalize">{pendingProgram}</span>
              </button>
              <button
                type="button"
                onClick={() => setPendingProgram(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
      {/* FFMI estimator apply confirm (E14) */}
      {pendingFfmi && ffmiPlan !== null && ffmiDraft !== null && bfDraft !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm FFMI targets"
        >
          <Card className="max-w-md">
            <h2 className="text-base font-semibold">Apply FFMI-based targets?</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              This writes your target inputs: lean-mass increase{' '}
              <span className="font-medium">
                {formatFixed(kgToUnit(ffmiPlan.increase, units), 2)} {wUnit}
              </span>
              , target body-fat <span className="font-medium">{formatFixed(bfDraft, 1)}%</span> and
              FFMI target <span className="font-medium">{formatFixed(ffmiDraft, 1)}</span>. The
              sheet&rsquo;s target weight then derives from these, exactly as from hand-entered
              values.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={applyFfmiTargets}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Apply targets
              </button>
              <button
                type="button"
                onClick={() => setPendingFfmi(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
    </Page>
  )
}

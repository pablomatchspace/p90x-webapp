import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { formatLong, isISODate, todayISO } from '@/lib/shared'
import { getTemplate, getWorkout, type ProgramKey } from '@/lib/shared'
import { startProgram } from '@/state/actions'
import { useSettings } from '@/state/selectors'

const VARIANTS: { value: ProgramKey; label: string; hint: string }[] = [
  { value: 'classic', label: 'Classic', hint: 'The standard rotation — resistance-heavy.' },
  { value: 'lean', label: 'Lean', hint: 'More cardio, less resistance.' },
]

/** The workouts scheduled on day 1, so the variant choice is concrete. */
function day1Of(program: ProgramKey): string {
  return getTemplate(program)[0]
    .workouts.map((key) => getWorkout(key).name)
    .join(' + ')
}

const primaryButton =
  'inline-flex min-h-11 items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton =
  'inline-flex min-h-11 items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'

/**
 * The no-import entry path (US-085): pick a start date, pick a variant, go. Body
 * stats and targets stay optional — the schedule only needs the date, and Settings
 * covers the rest whenever the user gets to it.
 */
export function StartPage() {
  const settings = useSettings()
  const navigate = useNavigate()
  const [date, setDate] = useState(todayISO())
  const [program, setProgram] = useState<ProgramKey>(settings.program)

  // Landing here with a program already running (typed URL, back button): never
  // clobber it. Changing day 1 belongs in Settings, which confirms the shift.
  if (settings.startDate !== null) {
    return (
      <Page title="Start a program" subtitle="You already have one running">
        <Card>
          <h2 className="font-semibold">Program already started</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Day 1 is {formatLong(settings.startDate)}. You can move the start date in Settings, or
            clear everything from More &rarr; Data.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/today" className={primaryButton}>
              Go to Today
            </Link>
            <Link to="/more/settings" className={secondaryButton}>
              Open Settings
            </Link>
          </div>
        </Card>
      </Page>
    )
  }

  const valid = date !== '' && isISODate(date)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    startProgram(date, program)
    navigate('/today')
  }

  return (
    <Page title="Start a program" subtitle="One date is all it takes">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Card>
          <h2 className="text-base font-semibold">When is day 1?</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Pick the date of your first workout. Past dates are fine — you&rsquo;ll land
            mid-program.
          </p>
          <input
            type="date"
            aria-label="Start date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-3 min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          {valid ? (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Day 1 lands on <span className="font-medium">{formatLong(date)}</span>.
            </p>
          ) : (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-500">
              Pick a valid date to continue.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-base font-semibold">Which rotation?</h2>
          <div
            role="radiogroup"
            aria-label="Program variant"
            className="mt-3 flex flex-col gap-2 sm:flex-row"
          >
            {VARIANTS.map((variant) => (
              <button
                key={variant.value}
                type="button"
                role="radio"
                aria-checked={program === variant.value}
                onClick={() => setProgram(variant.value)}
                className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
                  program === variant.value
                    ? 'border-red-600 bg-red-50 dark:bg-red-950/30'
                    : 'border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="text-sm font-semibold">{variant.label}</span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                  {variant.hint}
                </span>
                <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                  Day 1: {day1Of(variant.value)}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            You can switch rotation later without losing logged sessions.
          </p>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!valid} className={primaryButton}>
              Start program
            </button>
            <Link to="/more/data" className={secondaryButton}>
              Import data instead
            </Link>
          </div>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Height, weight and targets are optional — add them any time under More &rarr; Settings.
            Everything stays on this device.
          </p>
        </Card>
      </form>
    </Page>
  )
}

import { useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { NoProgramCard } from '@/components/NoProgramCard'
import { Card, Page } from '@/components/Page'
import { compareISO, todayISO } from '@/lib/shared'
import { getWorkout } from '@/lib/shared'
import type { ProgramDay } from '@/lib/schedule'
import { newRemapOp, remapBaseWeek } from '@/lib/schedule'
import { addScheduleOp } from '@/state/actions'
import { useSchedule } from '@/state/selectors'
import { useStore } from '@/state/store'

const ghostBtn =
  'rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
const primaryBtn =
  'rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40'

const IDENTITY = [0, 1, 2, 3, 4, 5, 6]

function slotNames(day: ProgramDay): string {
  return day.workouts.map((k) => getWorkout(k).name).join(' + ')
}

/** Reorderable list; remounted (via key) whenever the base week changes. */
function OrderList({
  base,
  fromWeek,
  onApplied,
}: {
  base: ProgramDay[]
  fromWeek: number
  onApplied: () => void
}) {
  const [order, setOrder] = useState<number[]>(IDENTITY)
  const visible = base.length // 7, or 6 in week 13
  const dirty = order.some((v, i) => v !== i)

  const move = (pos: number, delta: -1 | 1) => {
    setOrder((current) => {
      const next = [...current]
      ;[next[pos], next[pos + delta]] = [next[pos + delta], next[pos]]
      return next
    })
  }

  return (
    <>
      <ol className="flex flex-col gap-1.5">
        {order.slice(0, visible).map((slotIdx, pos) => {
          const names = slotNames(base[slotIdx])
          return (
            <li
              key={base[slotIdx].programDayId}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <span className="w-12 shrink-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Day {pos + 1}
              </span>
              <span className="flex-1">{names}</span>
              <button
                type="button"
                aria-label={`Move ${names} up`}
                disabled={pos === 0}
                onClick={() => move(pos, -1)}
                className="rounded-md border border-zinc-300 p-1.5 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Move ${names} down`}
                disabled={pos === visible - 1}
                onClick={() => move(pos, 1)}
                className="rounded-md border border-zinc-300 p-1.5 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
              </button>
            </li>
          )
        })}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryBtn}
          disabled={!dirty}
          onClick={() => {
            addScheduleOp(newRemapOp(fromWeek, order))
            onApplied()
          }}
        >
          Apply new order
        </button>
        <button
          type="button"
          className={ghostBtn}
          disabled={!dirty}
          onClick={() => setOrder(IDENTITY)}
        >
          Reset
        </button>
      </div>
    </>
  )
}

/** US-033 — remap which workout falls on which weekday, from a chosen week forward. */
export function WeeklyEditorPage() {
  const schedule = useSchedule()
  const program = useStore((s) => s.data.settings.program)
  const startDate = useStore((s) => s.data.settings.startDate)
  const ops = useStore((s) => s.data.scheduleOps)
  const [chosenWeek, setChosenWeek] = useState<number | null>(null)
  const [applied, setApplied] = useState(false)

  if (schedule === null || startDate === null) {
    return (
      <Page title="Weekly order" subtitle="Remap workouts to weekdays">
        <NoProgramCard hint="Start a program first, then shape the week to your reality." />
      </Page>
    )
  }

  const today = todayISO()
  let currentWeek = 1
  for (const d of schedule.days) {
    if (d.kind === 'program' && compareISO(d.date, today) <= 0) currentWeek = d.week
  }
  const fromWeek = chosenWeek ?? currentWeek
  const base = remapBaseWeek(program, startDate, ops, fromWeek)
  const activeRemaps = ops.filter((o) => o.kind === 'remap' && o.revertedAt === undefined).length

  return (
    <Page
      title="Weekly order"
      subtitle="Move workouts between weekdays"
      actions={
        <Link
          to="/schedule"
          className="flex h-9 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Schedule
        </Link>
      }
    >
      <Card>
        <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
          Apply from week
          <select
            value={fromWeek}
            onChange={(e) => {
              setChosenWeek(Number(e.target.value))
              setApplied(false)
            }}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {Array.from({ length: 13 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          The new order applies to weeks {fromWeek}–13. Shown in template order — skipped and
          swapped days aren&apos;t reflected here.
        </p>
      </Card>

      <Card>
        <OrderList
          key={`${fromWeek}:${activeRemaps}`}
          base={base}
          fromWeek={fromWeek}
          onApplied={() => setApplied(true)}
        />
        <p role="status" className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
          {applied ? `Order applied — weeks ${fromWeek}–13 use the new pattern.` : ''}
        </p>
      </Card>
    </Page>
  )
}

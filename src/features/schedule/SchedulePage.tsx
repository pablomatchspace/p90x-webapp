import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Card, Page } from '@/components/Page'
import { formatLong, formatShort, todayISO } from '@/lib/dates'
import { getWorkout } from '@/lib/programData'
import { groupByWeek, type ScheduleDay, type WeekSection } from '@/lib/schedule/materialize'
import { dayStatus, type DayStatus, type SessionIndex } from '@/lib/schedule/status'
import { useSchedule, useSessionIndex } from '@/state/selectors'
import { ProgramStatusBar } from './ProgramStatusBar'
import { CELL_CLASSES, DAY_STATUS_LABELS, shortCode } from './scheduleUi'

function DayCell({
  day,
  status,
  isToday,
}: {
  day: ScheduleDay
  status: DayStatus
  isToday: boolean
}) {
  const dayOfMonth = Number(day.date.slice(8))
  const label =
    day.kind === 'gap'
      ? `${formatLong(day.date)}: skipped day`
      : `${formatLong(day.date)}: ${day.workouts.map((k) => getWorkout(k).name).join(' + ')} — ${DAY_STATUS_LABELS[status]}`
  return (
    <Link
      to={`/day/${day.date}`}
      aria-label={label}
      aria-current={isToday ? 'date' : undefined}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg border p-1 text-center hover:brightness-95 dark:hover:brightness-125 ${CELL_CLASSES[status]} ${
        isToday ? 'ring-2 ring-red-600 dark:ring-red-500' : ''
      }`}
    >
      <span className="text-[10px] font-semibold opacity-70">{dayOfMonth}</span>
      {day.kind === 'gap' ? (
        <span className="text-[9px] tracking-wide uppercase">skip</span>
      ) : (
        <>
          <span className="text-[10px] leading-none font-bold">{shortCode(day.workouts[0])}</span>
          {day.workouts.length > 1 ? (
            <span className="text-[8px] leading-none opacity-80">{shortCode(day.workouts[1])}</span>
          ) : null}
        </>
      )}
    </Link>
  )
}

function Week({
  section,
  index,
  today,
  todayRef,
}: {
  section: WeekSection
  index: SessionIndex
  today: string
  todayRef: React.RefObject<HTMLElement | null>
}) {
  const first = section.days[0]
  const last = section.days[section.days.length - 1]
  const containsToday = section.days.some((d) => d.date === today)
  return (
    <section ref={containsToday ? todayRef : undefined} aria-label={`Week ${section.week}`}>
      <header className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-semibold">Week {section.week}</span>
        <span className="text-zinc-500 dark:text-zinc-400">Phase {section.phase}</span>
        {section.recovery ? (
          <span className="text-amber-700 dark:text-amber-400">Recovery</span>
        ) : null}
        <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
          {formatShort(first.date)} – {formatShort(last.date)}
        </span>
      </header>
      <div className="grid grid-cols-7 gap-1">
        {section.days.map((d) => (
          <DayCell
            key={d.date}
            day={d}
            status={dayStatus(d, index, today)}
            isToday={d.date === today}
          />
        ))}
      </div>
    </section>
  )
}

const LEGEND: DayStatus[] = ['done', 'partial', 'missed', 'pending', 'rest', 'gap']

export function SchedulePage() {
  const schedule = useSchedule()
  const index = useSessionIndex()
  const today = todayISO()
  const todayRef = useRef<HTMLElement>(null)
  const hasSchedule = schedule !== null

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: 'center' })
  }, [hasSchedule])

  if (schedule === null) {
    return (
      <Page title="Schedule" subtitle="90 days, 3 phases">
        <Card>
          <h2 className="font-semibold">No program yet</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Import your data to see the 13-week calendar.
          </p>
          <Link
            to="/more/data"
            className="mt-3 inline-block rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Go to Import
          </Link>
        </Card>
      </Page>
    )
  }

  const weeks = groupByWeek(schedule.days)
  return (
    <Page title="Schedule" subtitle={`Started ${formatLong(schedule.startDate)}`}>
      <ProgramStatusBar />
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        {LEGEND.map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded border ${CELL_CLASSES[status]}`} aria-hidden />
            {DAY_STATUS_LABELS[status]}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-5">
        {weeks.map((section) => (
          <Week
            key={section.week}
            section={section}
            index={index}
            today={today}
            todayRef={todayRef}
          />
        ))}
      </div>
    </Page>
  )
}

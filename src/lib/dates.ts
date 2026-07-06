/**
 * Local-calendar date handling. Dates are ISO `YYYY-MM-DD` strings interpreted
 * in the device's local timezone — never UTC — so a workout scheduled for
 * "2026-07-06" is the same wall-calendar day everywhere (PRD §11.2: no UTC drift).
 */
export type ISODate = string

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export function isISODate(value: string): boolean {
  if (!ISO_RE.test(value)) return false
  const d = fromISO(value)
  return toISO(d) === value
}

/** Parse to a Date at local midnight. */
export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISO(date: Date): ISODate {
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(): ISODate {
  return toISO(new Date())
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Whole days from `a` to `b` (positive when b is later). Rounding absorbs DST offsets. */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000)
}

/** ISO strings compare correctly as plain strings. */
export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0
}

const longFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})
const shortFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

/** e.g. "Mon, Jul 6" */
export function formatLong(iso: ISODate): string {
  return longFmt.format(fromISO(iso))
}

/** e.g. "Jul 6" */
export function formatShort(iso: ISODate): string {
  return shortFmt.format(fromISO(iso))
}

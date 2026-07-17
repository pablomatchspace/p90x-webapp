/**
 * Ports of the application layer (hexagonal seam): the impure dependencies
 * use-cases need, behind swappable interfaces. Domain code in `src/lib` never
 * imports these — actions inject the values (timestamps) into pure functions.
 */

export interface Clock {
  /** Current instant as an ISO-8601 string — the shape every timestamp field stores. */
  nowISO(): string
}

const realClock: Clock = { nowISO: () => new Date().toISOString() }

/**
 * The clock actions stamp loggedAt/createdAt/archivedAt through. A live
 * binding (`let`, reassigned by setClock/resetClock) — every caller uses
 * `clock.nowISO()` rather than destructuring, so reassignment is visible
 * everywhere without an extra indirection layer.
 */
export let clock: Clock = realClock

/** Swap the clock (tests); pair with `resetClock` in afterEach. */
export function setClock(next: Clock): void {
  clock = next
}

export function resetClock(): void {
  clock = realClock
}

export type Detach = () => void

/** Wiring contract for the localStorage persister (`attachPersistence`). */
export interface PersistencePort {
  attach(): Detach
}

/** Wiring contract for the opt-in cloud-sync engine (`attachSync`). */
export interface SyncPort {
  attach(): Detach
}

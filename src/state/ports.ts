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

let active: Clock = realClock

/** The clock actions stamp loggedAt/createdAt/archivedAt through. */
export const clock: Clock = { nowISO: () => active.nowISO() }

/** Swap the clock (tests); pair with `resetClock` in afterEach. */
export function setClock(next: Clock): void {
  active = next
}

export function resetClock(): void {
  active = realClock
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

# Epic E9 — Fresh-start onboarding (begin from a date, no import)

> **Status:** delivered · **Stories:** US-084 → US-088 · **Depends on:** E0–E8 (v1.0.0)
> **One-liner:** Let a new user start a program by picking a **start date** — no
> converter, no JSON import, no sample data required.

## 1. Problem

A fresh install booted into a valid-but-empty document whose `settings.startDate`
was `null`, so `useSchedule()` returned `null` and every primary screen (Today,
Schedule, Dashboard, Weekly editor) showed the same dead end:

> **No program yet** — "Import your data…" **[Go to Import]**

That was a hard wall for the most obvious user: _someone starting the program on
Monday who has never touched the Excel workbook._ Their only routes in were
running a Python converter against a workbook they may not own, or loading a
demo dataset that isn't theirs.

## 2. What the investigation found

The data model already supported this; the gap was **discoverability**, not
capability. Concrete anchors:

| Fact                                                                          | Evidence                                                                                             |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A fresh visitor already holds a valid, schema-passing document                | `state/persist.ts` → `{ state: emptyState(), issue: 'empty' }`                                       |
| `emptyState()` returns workbook defaults with `startDate: null`               | `lib/schema.ts`                                                                                      |
| `startDate` is _designed_ to be null pre-setup                                | `lib/schema.ts` — _"null until the user configures or imports a program"_                            |
| The schedule is a pure function of `(program, startDate, ops)`                | `lib/schedule/materialize.ts`; `state/selectors.ts` → `startDate === null ? null : materialize(...)` |
| Classic⇄Lean already switches the 90-day template                             | `materialize` → `getTemplate(program)`                                                               |
| A null setup profile is a supported, tested path                              | `lib/setup.test.ts` → `setupDerived(emptyState().settings)`                                          |
| Settings _already_ let you set a start date with no friction when none exists | `features/more/SettingsPage.tsx`                                                                     |

**Consequence:** no factory, no `replaceData`, no destructive path, no schema
change, no migration, and no engine work. Setting `settings.startDate` _is_
creating a program. The epic is a screen, a guard, and copy.

## 3. Goals

1. A new user can be logging workouts within one screen and one date pick.
2. Zero engine work — reuse schedule/scoring/adherence untouched.
3. Never silently destroy an existing program.
4. Import stays a first-class path, not a demoted one.
5. **D3 holds unchanged** — the app still never _auto-loads_ anything; creating a
   program is an explicit user action.

## 4. Non-goals

- **A multi-step setup wizard.** Height/weight/body-fat/targets stay optional and
  editable in Settings. The date is the only field the schedule needs.
- **Changing the schedule, scoring or adherence engines.**
- **"Start over" (replacing an existing program).** Reset → start covers it; a
  dedicated destructive flow was not requested and is not built. `/start` refuses
  to overwrite.
- **A schema change.** `settings.startDate` was already nullable.

## 5. Design

**`startProgram(startDate, program)`** (`state/actions.ts`) sets `settings.program`
and `settings.startDate` in one mutation. It validates the ISO date and **refuses
when a program already exists** — re-anchoring day 1 remains `setStartDate`, which
the Settings screen guards behind a confirm.

**`/start`** (`features/start/StartPage.tsx`) is a route (linkable, e2e-friendly):
a date field defaulting to today, a Classic/Lean choice showing what day 1 actually
is for each, and a submit. Landing on it with a program already running renders a
non-destructive "already started" card instead of a form. Dates use the local
ISO helpers (`todayISO`, `isISODate`) — no `Date` UTC arithmetic.

**`NoProgramCard`** (`components/NoProgramCard.tsx`) replaces four near-identical
empty-state copies, leading with **Start a program** and keeping **Import your
data** as the secondary action. The "No program yet" heading is preserved.

## 6. Stories

- ✅ **US-084 · `startProgram` action + no-overwrite guard** (S, P0)
- ✅ **US-085 · `/start` onboarding screen** (M, P0)
- ✅ **US-086 · Shared `NoProgramCard` across the four empty states** (S, P0)
- ✅ **US-087 · e2e: first-visit journey + the no-clobber guard** (S, P0)
- ✅ **US-088 · Docs — README "Getting started", `CLAUDE.md`, this epic** (S, P0)

## 7. Scenario matrix

| Scenario                        | Expected                                                      |
| ------------------------------- | ------------------------------------------------------------- |
| Start date = today              | Day 1 of 90                                                   |
| Start date in the past (< 90 d) | Mid-program; Day _N_ of 90                                    |
| Start date > 90 days ago        | "Nothing scheduled — the program ended …" (existing branch)   |
| Start date in the future        | "Nothing scheduled — the program starts …" (existing branch)  |
| Blank / malformed date          | Submit disabled; `startProgram` also rejects it               |
| Program already exists          | `/start` shows "already started"; action refuses to overwrite |
| Lean selected                   | Lean template materialises (`getTemplate('lean')`)            |
| DST / timezone boundary         | Local-calendar ISO only; no UTC arithmetic                    |
| Reload after start              | Program persists (debounced 300 ms write)                     |

## 8. Risks & mitigations

| Risk                                                      | Mitigation                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Starting a program clobbers an existing one               | Guarded twice: `/start` renders a read-only card, and `startProgram` no-ops when `startDate !== null` |
| Users think the app is broken because body KPIs are blank | Onboarding copy points at Settings; null-setup empty states already existed and are tested            |
| Copy changes break e2e specs asserting "No program yet"   | Heading preserved; only supporting copy and buttons changed                                           |
| Date drifts across timezones                              | Reuse `todayISO`/`isISODate`; no `Date` UTC math                                                      |
| Scope creep into a setup wizard                           | Explicit non-goal                                                                                     |

## 9. Verification

- Unit: `startProgram` begins a program on a fresh document, refuses to overwrite,
  and rejects a malformed date (`state/actions.test.ts`).
- e2e (`e2e/journeys.spec.ts`): a genuine first visit — nothing in `localStorage` —
  reaches a **logged workout** via a start date alone and survives a real reload;
  a second spec pins the no-clobber guard.
- Full CI: lint, typecheck, unit, build, e2e, Lighthouse (perf / a11y /
  best-practices ≥ 90).

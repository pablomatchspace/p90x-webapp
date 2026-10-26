# Epic E37 — Workout gear

> **Status:** delivered · **Stories:** US-174
> **Ships as:** package **1.37.174**, displayed **`1.E37.U174`** · **Schema:** unchanged
> **One-liner:** every workout says what gear it needs — on Today, the workout pages,
> before play/focus start, and as a seven-day "have ready" roll-up.

---

## 1. Problem

Nothing in the app said what a workout needs. The athlete found out the pull-up
bar, bench or foam roller was missing after the video had started.

## 2. Decisions (owner, 2026-10-26)

| Topic | Decision |
|---|---|
| Scope | All suites — P90X Classic/Lean, Generation Next, bonus fivers, rest |
| Granularity | One gear list per workout (no required/optional split, no per-exercise tags) |
| Placement | Today workout card · workout detail page + Workouts list · before Play / Focus start · "Gear for the next 7 days" roll-up on Today |
| Ownership | Display only — the app does not track gear you own (no state, no schema change) |

## 3. Design

`src/lib/workouts/gear.ts` is hand-authored display data (like `focusSteps`'
round order): a small gear vocabulary (`GEAR_LABELS`, whose key order is display
order) and one list per workout key. Generation Next entries come from the
equipment lines of `docs/requirements/gennext-workouts.md`; Classic/Lean entries
are derived from the exercise catalog and the Classic requirement docs — the
workbook has no equipment column, so these are **not workbook-verified** and are
the part to review. Props the video merely makes optional or swaps for another
(assist band, "no bar = row") are listed when the video uses them.
`gearFor` throws for an unknown key, and a test requires an entry for every
workout of every suite, so a new workout cannot ship without one.
`gearForWorkouts` unions a set of workouts for the roll-up (bonus fivers are
optional add-ons and are not included).

UI: `GearList` (chips or one-line `inline`), used by the Today card, workout
detail, Workouts list, Play pre-start, Focus step 1 and the `WeekGear` card.

## 4. QA

`gear.test.ts` pins coverage of every workout, labels for every id, ordering and
the union; `e2e/gear.spec.ts` (desktop + realme) covers Today, roll-up, list,
detail, focus and a Classic day.

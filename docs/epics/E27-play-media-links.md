# Epic E27 — Workout media deeplinks in focus & play mode

> **Status:** delivered · **Stories:** US-142 · **PR:** #42 (shipped with E25 + E26); bug-fix releases B01 (PR #43) and B02 (PR #44)
> **Ships as:** package **1.27.142**, displayed **`1.E27.U142`**; bug-fix packages **1.27.142-b1/-b2**, displayed **`1.E27.U142.B01`/`.B02`** · **Schema:** unchanged (v10) · **Depends on:** E23 (`settings.workoutLinks` + `MediaLinks`)
> **One-liner:** Focus mode and guided play mode render the same E23
> `MediaLinks` launch buttons as the Today card and workout detail screen, so
> the session video/audio can be launched — or **relaunched mid-session** —
> without leaving the play flow.

---

## 1. Design

- **Reuse, not re-implementation:** the existing `MediaLinks` component
  (`src/features/workouts/MediaLinks.tsx`) mounts next to the step/idle
  controls on `FocusPage` and `PlayPage`. Same http(s)-only guarantees, same
  `target="_blank" rel="noopener noreferrer"` semantics, same accessible
  names — all enforced in E23's schema/parser/action layers.
- **Visible during playback too.** Play mode keeps the buttons on screen
  while a timeline is running, so a video can be relaunched mid-session
  (e.g. after the tab was closed) without stopping the player.
- **Zero change for unconfigured users:** renders nothing until a link is
  configured in Settings, exactly like the other surfaces.

## 2. Stories

### US-142 — `MediaLinks` on the focus & play screens (M, P0)

Mount points on both screens (idle and playing states), e2e coverage,
CHANGELOG + version bump.

**AC:** [x] configured links launch from focus and play mode · [x] buttons
remain available during playback · [x] nothing renders without a configured
link · [x] E23's URL-safety guarantees unchanged.

## 3. Bug-fix releases

### B01 (package 1.27.142-b1, PR #43)

First release under the post-1.E20.U128 bug-release counter with a real
package `-bN` suffix. Two chart-legibility fixes against U142 after
real-data feedback:

- the 7-day trend overlay draws in a **neutral grey** instead of the metric's
  own colour (three near-identical blue strokes on a sparse chart);
- the body-composition chart plots fat on its own **right-hand y-axis**
  (`LineChart` gains an opt-in `axis: 'left' | 'right'` per series), each
  axis auto-scaled and tinted to its series so the recomposition is actually
  visible. Single-axis charts render byte-identical (visual baselines
  unchanged).

### B02 (package 1.27.142-b2, PR #44)

The Today nutrition card led with two same-weight calorie numbers (booklet
plan vs evidence-based target) that read as contradictory instructions.
**Your target** now leads the card with a conditional one-line explainer
(only when a target exists); the **P90X booklet plan** tucks behind a
disclosure, auto-expanded only when no personal target exists yet.

## 4. Out of scope

Embedded playback inside the app (E23's design stands — links open
externally, the offline-first PWA stays network-free at runtime); syncing
playback position; logging which media was used.

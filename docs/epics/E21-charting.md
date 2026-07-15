# Epic E21 — Sophisticated charting (crosshair, trends, phase bands, new charts)

> **Status:** delivered · **Stories:** US-129 · **PR:** #36
> **Ships as:** package **1.21.129**, displayed **`1.E21.U129.B00`** · **Schema:** unchanged (v6)
> **One-liner:** The hand-rolled SVG charts grow up — a crosshair read-out, point
> markers, program-phase shading and a dashed moving-average trend overlay —
> plus three new charts: **Body composition** (lean vs fat mass), **Session
> total** (whole-workout net score) and a cumulative **Adherence trend** line.

---

## 1. Design

- **All chart math stays pure `src/lib`** (rule 2 — nothing derived is stored):
  - `chart.ts` — `movingAverage` (trailing x-window that flows through gaps)
    and `nearestX` (crosshair snapping).
  - `adherence.ts` — `adherenceTrend`: cumulative done/scheduled rate per
    elapsed program day, same conventions as the headline rate.
  - `progression.ts` — `workoutTotalTrend`: whole-session net score per
    occurrence.
- **`LineChart` upgrades** (still no chart library):
  - Pointer crosshair snapped to the nearest logged x with a per-series
    value + date read-out row (hover **and** touch).
  - Optional point markers — which also fixed isolated entries between gaps
    being invisible (a bare SVG `M` subpath draws nothing).
  - Background x-bands for program-phase shading; per-series dash/width;
    `includeZero` for score/rate axes.
- **New charts:**
  - Body trends: dashed 7-day trend overlay, weigh-in markers, phase bands,
    date crosshair, and a new **Body composition** card (lean mass vs fat
    mass — recomposition made visible).
  - Strength progression: dots, week/date crosshair, and a new **Session
    total** card with a 3-session trend.
  - Dashboard Adherence & pace: cumulative adherence trend line (0–100% axis).

## 2. Stories

### US-129 — crosshair, trend lines, phase bands and new charts (L, P1)

Everything above in one story: the three pure helpers with unit tests, the
`LineChart` interaction/rendering upgrades, and the three new chart cards.
Linux visual baselines for `04-dashboard-populated` regenerated (all other
baselines passed untouched); the win32 pair regenerated on the Windows dev
machine per CLAUDE.md.

**AC:** [x] crosshair reads out every series at the snapped x on hover and
touch · [x] isolated points between gaps are visible · [x] trend overlays are
dashed and visually distinct from the metric line · [x] chart math unit-tested
in `src/lib` with no derived values stored.

## 3. Out of scope

Zoom/pan, data export from charts, third-party chart libraries (the PRD's
hand-rolled SVG rule stands). The dual-axis composition chart and the neutral
trend colour arrived later as the E27 B01 bug-fix release.

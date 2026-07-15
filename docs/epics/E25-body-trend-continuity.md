# Epic E25 — Body-trend continuity, composition units & motivation-first dashboard

> **Status:** delivered · **Stories:** US-137 → US-139 · **PR:** #42 (shipped with E26 + E27)
> **Ships as:** part of package **1.25.139** (final PR version 1.27.142, displayed **`1.E27.U142`**) · **Schema:** unchanged (v9)
> **One-liner:** Trend lines no longer break on days without a weigh-in —
> carried-forward spans draw **dashed and faded** so assumed data never reads
> as observed — the composition chart gains a kg/% unit toggle, and the daily
> quote moves to the top of the Dashboard.

---

## 1. Design

- **Carry-forward continuity** (`fillForward` in `src/lib/chart.ts`, U138):
  gaps between weigh-ins are filled with the last real measurement as flagged
  `filled` points, so the metric chart and the composition chart draw one
  unbroken line while markers and the crosshair still snap only to real
  logged days. Carried-forward (assumed) spans render **dashed and faded**
  with a "┈ assumed (no weigh-in)" legend note. The 7-day trend averages the
  **real samples only**, so carried-forward copies never drag it.
- **Composition unit toggle** (U137): the body-composition chart switches
  between absolute mass (kg/lb) and percent of body weight. Lean % derives as
  100 − BF %, so it works even on weigh-ins without a weight reading; the
  chart defaults to whichever mode actually has data. Ephemeral UI state —
  nothing persisted (rule 2).
- **Motivation-first dashboard** (U139): the daily-quote card moves to the
  top of the Dashboard, the first widget below the title.

## 2. Stories

### US-137 — composition kg/% unit toggle (M, P1)

Percent derivation in the composition series, the toggle UI, and the
has-data default-mode pick.

**AC:** [x] % mode works on weigh-ins without a weight reading · [x] default
mode is the one with data.

### US-138 — `fillForward` carry-forward continuity (M, P0)

The pure helper with unit tests; dashed/faded assumed spans + legend note;
crosshair/markers restricted to real samples; real-sample-only 7-day trend.

**AC:** [x] one unbroken line across weigh-in gaps · [x] assumed spans
visually distinct and labelled · [x] trend unaffected by filled copies.

### US-139 — motivation-first dashboard (S, P1)

Quote card repositioned to the top of the Dashboard; visual baselines
regenerated.

## 3. Out of scope

Interpolation between weigh-ins (carry-forward only — the chart never invents
a slope); persisting the unit toggle. The neutral trend colour and the
dual-axis composition chart landed immediately after as the **E27 B01**
bug-fix release (PR #43).

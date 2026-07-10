# P90X Tracker

A mobile-first, offline-capable **PWA** that replaces a 52-sheet P90X Excel
workbook (P90Xcel v2.05) with a fast, client-only web app — workout logging,
rescheduling, a body-metrics dashboard, and the workbook's exact scoring engine.

**Live:** https://pablomatchspace.github.io/p90x-webapp/

> **Your data stays on your device.** There is no backend, no account, and no
> analytics. Everything lives in your browser's `localStorage` and in the JSON
> file you export. The public app and its tests use a **fabricated sample
> dataset** — no real personal data is in this repository (PRD decision D3).

## Why

The Excel workbook works but is painful on a phone mid-workout: rescheduling
means unprotecting sheets and running VBA macros, the charts are dated, and data
entry is slow. This app keeps the workbook's proven data model and scoring math,
and adds first-class rescheduling, a real dashboard, fast entry (ghost prefill,
steppers, focus mode, rest timer), and a Classic⇄Lean toggle.

## Features

- **Start in one step** — pick the date of your first workout and the whole
  13-week schedule builds itself. No spreadsheet, no import, no account.
- **Today & Schedule** — 13-week calendar with per-day status, phase bands, and
  one-tap logging; four rescheduling modes (skip/shift, move/swap, pull-forward,
  weekly template remap) with preview, undo, and an audit trail.
- **Workout logging** — the workbook's scoring engine computed live (adjusted
  reps, penalties, R×W), a familiar week grid, and a one-exercise-at-a-time focus
  mode with per-exercise history.
- **Body log** — daily scale entries with derived BMI / lean mass / FFMI +
  category, colour-coded against your SETUP targets and limits.
- **Dashboard** — body-vs-target KPIs, adherence & pace, strength progression
  charts (hand-rolled SVG, no chart library), and a deterministic daily quote.
- **Settings & extras** — every SETUP field editable with guardrails, unit
  toggle, editable quote pack, free-form notes, Navy/3-site/7-site body-fat
  calculators, and a Help/About page.
- **Resilience** — a global error boundary, corrupted-storage quarantine +
  recovery, a one-slot backup written before every destructive action, and a
  storage-full warning.

## Getting started

The app **never auto-loads** data, so nothing happens until you choose one of
three ways in:

1. **Start a program** _(no import)_ — open the app, hit **Start a program**, pick
   the date of your first workout and choose Classic or Lean. That's it: the
   schedule is derived from the start date, so you're logging immediately. Height,
   weight and targets are optional and can be filled in later under
   **More → Settings**.
2. **Import your workbook** — if you already tracked in Excel, convert and import
   it (below); your history comes with you.
3. **Try the sample** — **More → Data → Try sample data** loads the fabricated
   demo dataset so you can look around.

### Bringing in an existing workbook

Run the converter locally and import the resulting file:

```bash
python tools/convert_xlsm.py "P90X Classic ….xlsm" -o p90x-data.json
```

Then **More → Data → Choose file** and confirm the preview. The converter output
(`p90x-data*.json`) is gitignored and never leaves your machine. You can export a
backup at any time from the same screen; import→export→import is lossless.

## Tech stack

Vite · React 19 + TypeScript · React Router (HashRouter) · Zustand + Immer ·
Zod (import validation) · Tailwind CSS · `vite-plugin-pwa` (Workbox) · Vitest +
Testing Library · Playwright · oxlint · Prettier · Lighthouse CI.

Design principles: **only raw inputs are stored** — every derived number (scores,
penalties, BMI, FFMI, adherence) is a pure function in `src/lib`, mirroring the
workbook's formula design. Dates are local-calendar ISO strings (`YYYY-MM-DD`,
no UTC conversion).

## Development

```bash
npm install
npm run dev           # Vite dev server
npm run build         # tsc -b + vite build (production bundle)
npm run preview       # serve the built app

npm run lint          # oxlint (zero warnings)
npm run typecheck     # tsc -b
npm run test          # Vitest unit/logic suites
npm run test:coverage # + coverage on src/lib and src/state
npm run e2e           # Playwright (build first) — chromium + Pixel 7
npm run lhci          # Lighthouse CI budget (build first)
npm run format        # Prettier
```

`npm run e2e` and `npm run lhci` serve the **built** app, so run `npm run build`
first if the source changed.

## Project structure

```
src/lib/        pure logic — scoring, schedule, body/setup math, adherence, charts (fully unit-tested)
src/state/      Zustand store, actions, localStorage persistence + recovery
src/features/   screens by area (start, today, schedule, workouts, body, dashboard, more)
src/components/ shared UI (Layout, Page, NoProgramCard, ErrorBoundary, SystemBanners, LineChart)
src/data/       generated static assets — Classic/Lean templates + exercise catalog (no personal data)
public/         icons, favicon, and the fabricated sample-data.json
e2e/            Playwright specs — per-feature + cross-feature journeys
tools/          xlsm→JSON converter and the program/catalog generator
docs/           sanitized PRD.md, the story index, and per-epic write-ups
```

## Testing & CI

Every PR and push to `main` runs the **CI** workflow, whose three jobs go in
parallel:

- **validate** — lint, format check, typecheck, unit tests (+ coverage), build.
- **e2e** — the full Playwright suite on chromium + a mobile profile.
- **lighthouse** — Lighthouse CI asserting performance / accessibility /
  best-practices ≥ 90 on the built app.

Two more workflows run alongside it: **CodeQL** (security scanning) and, on
`main` only, **Deploy to GitHub Pages**. Dependabot is enabled.

## Attribution & disclaimer

Data model, schedule, exercise names and scoring rules are derived as **factual
data** from the P90Xcel v2.05 workbook (workoutsoft.com). This is a personal,
non-commercial tool. "P90X" and related marks belong to their respective owners;
this project ships **no** Beachbody/P90X branding or logo assets and is not
affiliated with or endorsed by them.

## Docs

- [`docs/PRD.md`](docs/PRD.md) — the product requirements (sanitized).
- [`docs/stories/`](docs/stories/) — the delivered user-story index.
- [`docs/epics/`](docs/epics/) — per-epic write-ups for work after v1.0.0.
- [`CLAUDE.md`](CLAUDE.md) — conventions and the story-execution protocol for
  contributors (human or AI agent).

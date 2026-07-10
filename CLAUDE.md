# CLAUDE.md — working agreement

Guidance for anyone (human or AI agent) changing this repo. Read this and
[`docs/PRD.md`](docs/PRD.md) before starting. Keep changes surgical and match the
surrounding style.

## What this is

A client-only, offline-first PWA replacing a P90X Excel workbook. No backend, no
accounts, no network calls at runtime. Vite + React 19 + TypeScript, Zustand +
Immer state, Zod-validated import, Tailwind, hand-rolled SVG charts, `vite-plugin-pwa`.

A program exists exactly when `settings.startDate` is non-null — the schedule is
`materialize(program, startDate, ops)`, nothing is stored. So there are three ways
one comes into being: `startProgram` (the `/start` screen, no import), import, and
backup restore. `startProgram` refuses to overwrite an existing program; moving
day 1 afterwards is `setStartDate`, which Settings guards behind a confirm.

## Non-negotiable rules

1. **The workbook is the oracle.** Scoring, schedule, and body/setup formulas
   reproduce `P90X Classic ….xlsm` (P90Xcel v2.05) exactly. Encode formulas
   verbatim and pin them with golden-master tests against cached Excel outputs.
   Intentional deviations are allowed only where PRD §6.4 documents them (e.g. the
   canonical penalty rule B3) — document the deviation in code + a test.
2. **Never store derived values.** Only raw inputs live in state; every score,
   penalty, BMI, FFMI, adherence number is a pure function in `src/lib`. This
   keeps import/export minimal and testable.
3. **Personal data is local-only (D3).** The app never auto-loads data. Real
   converter output (`p90x-data*.json`) is gitignored. The repo ships only the
   fabricated `public/sample-data.json`. Do not commit real figures — not in
   code, tests, fixtures, or docs (`docs/PRD.md` is a sanitized copy).
4. **No fabricated quote attributions (D5).** Built-in quotes are unattributed
   unless the attribution is verifiable.
5. **Dates are local-calendar ISO strings** (`YYYY-MM-DD`). Never do `Date` UTC
   arithmetic — it drifts across DST/timezones.

## Layout

```
src/lib/        pure logic (scoring, schedule/*, body, setup, bodyFat, adherence, progression, chart, quotes, dates)
src/state/      store.ts (Zustand+Immer), actions.ts (all mutations funnel through useStore.getState().mutate), persist.ts
src/features/   screens by area: start, today, schedule, workouts, body, dashboard, more
src/components/ Layout, Page, NoProgramCard, ErrorBoundary, SystemBanners, LineChart, UpdateToast
src/data/       templates.json + catalog.json — generated from the workbook by tools/, never hand-edited
e2e/            Playwright specs (per-feature + journeys.spec.ts)
tools/          convert_xlsm.py (workbook→JSON) and program/catalog generators
```

Path alias: `@/*` → `src/*`. TS is strict with `verbatimModuleSyntax` (use
`import type` for types) and `erasableSyntaxOnly` (no enums / parameter
properties / namespaces).

## Workflow

- **One epic = one branch = one PR**, squash-merged after CI is green. Branch
  name `claude/epic-eN-<slug>`. Story-level Conventional Commits within the branch.
- **Validate before every commit:** `npm run format` then
  `npm run lint && npm run typecheck && npm run test && npm run build`
  (+ `npm run e2e` if a journey changed, + `npm run lhci` if UI/perf changed).
- Stage explicit file lists — never `git add -A` (`dist/` and personal data are
  gitignored, but be deliberate).
- End commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- PR body: what / why / how + the story AC checklist.

## Testing conventions

- **Vitest** runs in `node` by default; DOM/localStorage suites opt in per file
  with `// @vitest-environment jsdom`. Globals are **off** — import `describe`,
  `it`, `expect`, `vi` from `vitest`. `@testing-library/jest-dom` is set up via
  `src/test/setup.ts`; call `cleanup()` yourself in `afterEach` (no auto-cleanup).
- Coverage is collected on `src/lib/**` and `src/state/**`.
- **Playwright** serves the **built** app — run `npm run build` before `npm run e2e`.
  Runs chromium + a Pixel 7 mobile profile.
- **E2E pitfalls (learned the hard way):**
  - `getByLabel` substring-matches — `'X round 1 reps'` also hits the
    `'Increase X round 1 reps'` stepper. Prefer `getByRole('textbox', { name })`
    or `{ exact: true }`.
  - Persistence is debounced 300 ms. A full reload (`page.goto('/')`, which vite
    preview redirects to the base path) needs the write flushed first — advance
    `page.clock.fastForward(500)`, or navigate by **hash** (`page.goto('#/…')`)
    which keeps the in-memory store (no reload).
  - Seed browser state before boot with `page.addInitScript` (the e2e tsconfig
    includes the DOM lib for these callbacks).

## Quality gates

The `CI` workflow (`.github/workflows/ci.yml`) runs three jobs: **validate**
(lint, format check, typecheck, coverage, build), **e2e**, and **lighthouse**
(perf / a11y / best-practices ≥ 90 via `lighthouserc.json`). Separate workflows
run **CodeQL** and, on `main`, **Deploy to GitHub Pages**. Dependabot is enabled.

## Schema changes

State is a single versioned JSON document (`schemaVersion`). If you change its
shape, bump the version and add a migration in `src/lib/migrations.ts` — loading
an old/corrupt document must degrade to a clean empty state with a recovery
offer, never a crash or silent data loss.

# CLAUDE.md — working agreement

Guidance for anyone (human or AI agent) changing this repo. Read this and
[`docs/PRD.md`](docs/PRD.md) before starting. Keep changes surgical and match the
surrounding style.

## What this is

A client-only, offline-first PWA replacing a P90X Excel workbook. No accounts, and
no network calls at runtime **except** the opt-in cloud sync of E10, which is off
unless the user configures an endpoint they host themselves. (E30's voice entry
relies on the browser's own speech-recognition engine, which may call its vendor's
service while the user holds the mic open — the app itself sends nothing and
stores only the parsed numbers.) Vite + React 19 +
TypeScript, Zustand + Immer state, Zod-validated import, Tailwind, hand-rolled SVG
charts, `vite-plugin-pwa`.

A program exists exactly when `settings.startDate` is non-null — the schedule is
`materialize(program, startDate, ops)`, nothing is stored. So there are four ways
one comes into being: `startProgram` (the `/start` screen, no import), import,
backup restore, and restoring an archived round (E28). `startProgram` refuses to
overwrite an existing program; moving day 1 afterwards is `setStartDate`, which
Settings guards behind a confirm. Completed rounds live in the top-level `rounds`
archive (raw inputs + a frozen snapshot of the round-scoped SETUP inputs) —
`completeRound` archives and resets, and reports/comparisons recompute from the
snapshot so later Settings changes never rewrite history.

## Non-negotiable rules

1. **The workbook is the oracle.** Scoring, schedule, and body/setup formulas
   reproduce `P90X Classic ….xlsm` (P90Xcel v2.05) exactly. Encode formulas
   verbatim and pin them with golden-master tests against cached Excel outputs.
   Intentional deviations are allowed only where PRD §6.4 documents them (e.g. the
   canonical penalty rule B3) — document the deviation in code + a test.
2. **Never store derived values.** Only raw inputs live in state; every score,
   penalty, BMI, FFMI, adherence number is a pure function in `src/lib`. This
   keeps import/export minimal and testable.
3. **Personal data is local-only by default (D3, as amended by E10).** The app
   never auto-loads or auto-uploads data. Cloud sync is strictly opt-in,
   end-to-end encrypted on the device, and points at a backend the user hosts —
   the plaintext never leaves the browser, and with sync off there are zero
   network calls. **No secret is ever written to `localStorage`:** the passphrase
   is never persisted at all, and the non-extractable AES key plus the auth token
   live in IndexedDB (`state/syncSecrets.ts`). Keep it that way — CodeQL's
   clear-text-storage rule guards this, and it is right to. Real converter output
   (`p90x-data*.json`) is gitignored. The repo ships only the fabricated
   `public/sample-data.json`. Do not commit real figures — not in code, tests,
   fixtures, or docs (`docs/PRD.md` is a sanitized copy). Never commit a
   `SYNC_TOKEN`, endpoint, or KV id.
4. **No fabricated quote attributions (D5).** Built-in quotes are unattributed
   unless the attribution is verifiable.
5. **Dates are local-calendar ISO strings** (`YYYY-MM-DD`). Never do `Date` UTC
   arithmetic — it drifts across DST/timezones.
6. **No unilateral product decisions — reflect, propose, ask.** Before writing
   any code (features and bug fixes alike), enumerate every product-scope,
   ambiguity, requirement, and trade-off decision the task involves — no matter
   how small — and put each to the user as concrete options with a
   recommendation, batched into one question set up front. Wait for selections
   before proceeding; a decision discovered mid-task pauses work and gets asked
   immediately. Only purely mechanical changes with zero interpretation (e.g.
   correcting a formula against the pinned workbook oracle) proceed directly —
   when in doubt, it's a decision: ask.

## Layout

```
src/lib/        pure domain logic in seven bounded contexts (docs/CONTEXT-MAP.md), each
                with a public index.ts barrel enforced by architecture.test.ts:
                  schedule/   materialize, occurrences, ops, status, adherence
                  workouts/   scoring, progression, overload, playback, focusSteps, voiceEntry, timelines/*
                  body/       body, bodyFat, ffmi, setup, feasibility
                  nutrition/  nutrition
                  rounds/     roundReport, roundCompare
                  sync/       sync, syncCrypto
                  shared/     schema, migrations, importExport, dates, programData, chart, links, quotes, version
                Cross-context imports use the barrel (`@/lib/<context>`); vocabulary in docs/GLOSSARY.md
src/state/      store.ts (Zustand+Immer), actions.ts (all mutations funnel through useStore.getState().mutate), persist.ts
src/features/   screens by area: start, today, schedule, workouts, body, dashboard, more
src/components/ Layout, Page, NoProgramCard, ErrorBoundary, SystemBanners, LineChart, UpdateToast
src/data/       templates.json + catalog.json — generated from the workbook by tools/, never hand-edited
e2e/            Playwright specs (per-feature + journeys.spec.ts)
tools/          convert_xlsm.py (workbook→JSON) and program/catalog generators
worker/         optional self-hosted sync Worker — plain JS, no imports (paste-able
                into the Cloudflare dashboard); typechecked via checkJs, tested in
                the main Vitest run, and NEVER deployed by CI
```

Path alias: `@/*` → `src/*`. TS is strict with `verbatimModuleSyntax` (use
`import type` for types) and `erasableSyntaxOnly` (no enums / parameter
properties / namespaces).

## Workflow

- **One epic = one branch = one PR**, squash-merged after CI is green. Branch
  name `claude/epic-eN-<slug>`. Story-level Conventional Commits within the branch.
- **Version from E16 onward (Q20):** package.json stays semver, mapped as
  `1.{epicNumber}.{lastStoryNumber}` via `npm version <x.y.z> --no-git-tag-version`.
  More → Help displays `1.E{epic}.U{story}.B{NN}` through `formatAppVersion` (zero-padded
  bug-release counter, see below); historical versions before E16 keep their plain semver
  display. CHANGELOG headings use
  `## 1.E{epic}.U{story}.B{NN} (package 1.{epic}.{story}[-bN]) — YYYY-MM-DD`. This
  supersedes E13's minor/patch version rule.
  - **Bug-release counter (post-1.E20.U128):** a story release bumps package.json to
    `1.{epic}.{story}` (no suffix) and displays `B00` — nothing's been fixed against it
    yet. Each subsequent bug-fix-only PR against that _same_ story appends/increments a
    `-bN` prerelease suffix (`npm version 1.{epic}.{story}-bN --no-git-tag-version`),
    displaying `B{NN}`. Before bumping, check package.json's current version _and_ the
    latest CHANGELOG heading to find the last N used for this story — increment it for
    another bug fix; a new story drops the suffix entirely (reset to B00, next epic/story
    numbers). Never guess N from memory — always re-derive it from those two sources.
- **Test-driven development.** For pure logic — `src/lib/**`, `src/state/**`,
  `worker/` — red-green-refactor is mandatory: write the failing test first and
  watch it fail for the right reason, write the minimal code that makes it pass,
  then refactor with the suite green. Every bug fix starts with a failing test
  that reproduces the bug — no fix lands without one, and the test must fail
  before the fix and pass after. For UI (`src/features/**`, `src/components/**`)
  work test-first where feasible (component or e2e specs); pure visual polish
  may instead be verified after the fact via the e2e visual baselines. Tests and
  the code they drive belong to the same story commit.
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
- Coverage is collected on `src/lib/**`, `src/state/**`, and the sync Worker
  (`worker/index.js`).
- **TDD discipline** (see Workflow for when it's mandatory): one behavior per
  test, named for the behavior, arrange-act-assert. Assert observable behavior —
  function outputs, rendered UI, persisted documents — never implementation
  details or store internals. When encoding a workbook formula, the golden-master
  expectation (cached Excel output) is the failing test you write first; when
  fixing a divergence from the workbook, pin the workbook's value in a test
  before touching the formula.
- **Playwright** serves the **built** app — run `npm run build` before `npm run e2e`.
  Runs the desktop chromium and realme 16 Pro+ mobile profiles.
  **Playwright must also verify any UI issues visible in screens for both desktop and specific mobile device defined.**
  - **Per-platform visual baselines.** `e2e/smoke.spec.ts` compares full-page screenshots
    against `{platform}`-suffixed baselines (`snapshotPathTemplate`), so each OS matches only
    snapshots rendered by its own font/rasterization stack and the config threshold can stay
    tight (`maxDiffPixelRatio: 0.01`). Both `-win32` and `-linux` sets are committed.
    Regenerate **win32** on this machine:
    `npm run build && npx playwright test e2e/smoke.spec.ts --update-snapshots`.
    Regenerate **linux** via a temporary CI `--update-snapshots` job that uploads the
    `e2e/smoke.spec.ts-snapshots/` dir as an artifact (download with `gh run download`, keep the
    `*-linux.png` files), or via the `mcr.microsoft.com/playwright` Docker image when the daemon
    is running. macOS has no committed baselines — a contributor would generate `-darwin` locally.
- **E2E pitfalls (learned the hard way):**
  - A frozen `page.clock` (`clock.install`) **never advances by itself** — elapsed-time UI
    (focus playing/paused, any `now`-driven timer) needs an explicit `page.clock.fastForward(ms)`.
    Anchor the install time in UTC (`new Date('…Z')`) and pin `timezoneId` so it renders the same
    on every host.
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

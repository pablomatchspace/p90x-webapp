# Epic E14 — FFMI target estimator (Settings) + dashboard progress

> **Status:** SPEC — awaiting build greenlight · **Stories:** US-104 → US-107 · **Branch:** `claude/epic-e14-ffmi-target-estimator`
> **Ships as:** app version **1.5.0** · **Schema:** **v2 → v3** (adds `settings.targets.ffmi`)
> **Depends on:** E13 + E12 merged (version 1.4.0, SCHEMA_VERSION = 2, migration pipeline exists)
> **One-liner:** in Settings → Targets & limits, pick a **normalized-FFMI goal** and a plan body-fat % → the app shows the implied lean mass / lean gain / target weight and, on confirm, writes the existing target inputs plus a stored FFMI target that the dashboard tracks.

Execution blueprint — follow literally. If quoted "current code" doesn't match disk or a precondition fails, **STOP and report**.

---

## 0. Executor contract

Repo root `p90x-webapp/`; all commands run there.

**Preconditions — STOP on any mismatch:**

1. `git status` clean, on `main`, after `git pull`.
2. `node -e "console.log(require('./package.json').version)"` → `1.4.0`.
3. `src/lib/schema.ts` line 8: `export const SCHEMA_VERSION = 2`, and `src/lib/migrations.ts` contains a `MIGRATIONS` record with a `1:` entry (E12's pipeline).
4. `npm ci` if needed; `npm run test` green; `npm run build && npm run e2e` green before any change.

**Repo rules (self-contained):** Conventional Commits + trailer per `CLAUDE.md`; validate before every commit (`npm run format` then `npm run lint && npm run typecheck && npm run test && npm run build`, plus `npm run e2e` after `npm run build` when journeys change, plus `npm run lhci` once pre-PR — UI changes here); explicit `git add` lists; TS strict / `import type` / no enums; Vitest globals OFF, pure-logic tests in node (no jsdom pragma); e2e name-matching is substring — the selectors below are pre-checked for collisions, use them verbatim. Open the PR; **never merge**.

**DO NOT TOUCH:** `src/lib/scoring.ts`, the FFMI **display** formula's constant (6.1 — decision Q10), `docs/PRD.md`, `worker/**`.

---

## 1. Locked decisions (Pablo, 2026-07-11)

- **Q10:** keep the workbook's **6.1** normalization constant everywhere (MyPlate's page uses 6.3 — documented difference, NOT adopted; mixing was vetoed).
- **Q11 = Option A:** Apply writes the **honest lean-mass increase** (`FFMI-implied lean − start lean`). The sheet's own (dimensionally quirky) target-weight formula `inc + startLean + startLean × targetBF` stays the oracle for the derived read-out; the panel shows _both_ the FFMI-implied weight and the sheet-derived value so the small gap is visible, never hidden.
- **Q12:** a stored FFMI target **with dashboard progress tracking, now** ⇒ new raw input `settings.targets.ffmi` (a user-chosen goal — allowed under "never store derived"; nothing derived is persisted).
- Limits (weight/BMI caps) stay manual — the estimator only feeds targets.

## 2. Current state — verified anchors

- `src/lib/body.ts:38-41` — `deriveBody` computes `ffmi = leanMass / h2 + 6.1 * (1.8 - height)`; `:52-60` `ffmiCategory` bands (workbook SCHEDULE!K verbatim: <18, 18–20, 20–22, 22–23, 23–25, ≥25).
- `src/features/dashboard/bodyMetrics.ts:57-60` — duplicates the startFfmi formula; `:112-122` the `ffmi` metric already exists with `higherIsBetter: true` and **`target: null`** — the dashboard story is one line plus the schema field.
- `src/features/dashboard/KpiCards.tsx:60-64` — caption renders `` `Target ${formatFixed(m.target, m.dp)}${pct !== null ? ` · ${pct}%` : ''}` `` or `'No target set'`; `progressToTarget` (`bodyMetrics.ts:35-41`) already handles `higherIsBetter`.
- `src/features/more/SettingsPage.tsx` — Targets & limits card at `:286-368`; existing confirm-modal pattern at `:416-461` (`pendingStart`); helpers `Row`, `Derived`, `showWeight`, `units`, `wUnit`, `derived = setupDerived(settings)` all in scope.
- `src/state/actions.ts:223-227` — `updateTargets(patch: Partial<Settings['targets']>)` `Object.assign`s the patch: it gains `ffmi` for free once the schema has it.
- `src/lib/schema.ts:37` — `targets: z.object({ leanMassIncrease: nullableNumber, bodyFat: nullableNumber })`; `:137` emptyState `targets: { leanMassIncrease: null, bodyFat: null }`.
- Sample-data goldens (fabricated public dataset — safe to hardcode in tests): 1.8 m, 82 kg @ 22% → startLean 63.96, start normalized FFMI **19.74074074074074**; latest weigh-in 80.8 kg @ 21.2% → **19.65135802469136**. Plan "FFMI 21 @ 15%": lean **68.04**, increase **4.08** (rounded to 3 dp from 4.080000000000005), implied weight **80.04705882352943**, sheet target weight with the applied inc **77.634** → displays `77.6`. Dashboard progress: `round((19.65135802469136 − 19.74074074074074) / (21 − 19.74074074074074) × 100)` = **−7**.

## 3. The math (inverse of the existing formula — constant 6.1, reference 1.8 m)

```
normalized FFMI = lean/height² + 6.1 × (1.8 − height)
lean-for-FFMI   = (FFMI − 6.1 × (1.8 − height)) × height²
weight-for-lean = lean ÷ (1 − bf)            (bf as fraction, 0 ≤ bf < 1)
```

---

## 4. Story US-104 — `ffmi.ts` lib + schema v3 + refactors (M)

### 4.1 New file `src/lib/ffmi.ts` — EXACT content

```ts
/**
 * Normalized FFMI (E14) — the SCHEDULE col-J adjustment shared by deriveBody,
 * the dashboard metrics and the Settings target estimator, plus its inverse for
 * planning: pick a target normalized FFMI, get the lean mass / weight it
 * implies. Workbook constant 6.1 at the 1.8 m reference height — kept over
 * MyPlate's 6.3 by decision (E14 Q10) so targets and tracked values always
 * live on the same scale.
 */
export function normalizedFfmi(leanMass: number, height: number): number | null {
  if (height <= 0) return null
  return leanMass / (height * height) + 6.1 * (1.8 - height)
}

/** Inverse of normalizedFfmi: the lean mass that lands on `ffmi` at `height`. */
export function leanMassForFfmi(ffmi: number, height: number): number | null {
  if (height <= 0) return null
  return (ffmi - 6.1 * (1.8 - height)) * height * height
}

/** Total weight carrying `leanMass` at body-fat fraction `bf` (0–1). */
export function weightForLeanMass(leanMass: number, bf: number): number | null {
  if (bf < 0 || bf >= 1) return null
  return leanMass / (1 - bf)
}
```

### 4.2 New file `src/lib/ffmi.test.ts` — EXACT content

```ts
import { describe, expect, it } from 'vitest'
import { deriveBody } from './body'
import { leanMassForFfmi, normalizedFfmi, weightForLeanMass } from './ffmi'

describe('normalizedFfmi', () => {
  it('matches the sample-data goldens (height 1.8 → zero adjustment)', () => {
    expect(normalizedFfmi(63.96, 1.8)).toBeCloseTo(19.74074074074074, 12)
    expect(normalizedFfmi(63.6704, 1.8)).toBeCloseTo(19.65135802469136, 12)
  })

  it('applies the 6.1 adjustment away from 1.8 m', () => {
    expect(normalizedFfmi(70, 1.7)).toBeCloseTo(70 / 2.89 + 0.61, 12)
  })

  it('is exactly what deriveBody reports', () => {
    const derived = deriveBody(
      {
        date: '2026-01-19',
        weight: 80.8,
        bodyFat: 0.212,
        water: null,
        bone: null,
        zoneMinutes: null,
      },
      { height: 1.8, startWeight: 82 },
    )
    expect(derived.ffmi).toBeCloseTo(normalizedFfmi(80.8 * (1 - 0.212), 1.8) ?? NaN, 12)
  })

  it('returns null for a non-positive height', () => {
    expect(normalizedFfmi(60, 0)).toBeNull()
  })
})

describe('leanMassForFfmi (inverse)', () => {
  it('round-trips through normalizedFfmi at any height', () => {
    const lean = leanMassForFfmi(21, 1.8)
    expect(lean).toBeCloseTo(68.04, 10)
    expect(normalizedFfmi(lean ?? NaN, 1.8)).toBeCloseTo(21, 12)
    const shorter = leanMassForFfmi(21, 1.7)
    expect(normalizedFfmi(shorter ?? NaN, 1.7)).toBeCloseTo(21, 12)
  })

  it('returns null for a non-positive height', () => {
    expect(leanMassForFfmi(21, 0)).toBeNull()
  })
})

describe('weightForLeanMass', () => {
  it('computes the FFMI-implied weight at the plan body-fat', () => {
    expect(weightForLeanMass(68.04, 0.15)).toBeCloseTo(80.04705882352943, 9)
  })

  it('rejects impossible body-fat fractions', () => {
    expect(weightForLeanMass(68, -0.01)).toBeNull()
    expect(weightForLeanMass(68, 1)).toBeNull()
  })
})
```

### 4.3 `src/lib/body.ts` — use the shared helper

Add `import { normalizedFfmi } from '@/lib/ffmi'` after the existing schema import. Replace lines 38–41:

```ts
const ffmi =
  leanMass !== null && h2 !== null && height !== null ? leanMass / h2 + 6.1 * (1.8 - height) : null
```

with:

```ts
const ffmi = leanMass !== null && height !== null ? normalizedFfmi(leanMass, height) : null
```

(`h2` stays — BMI still uses it. Identical results: the helper returns null for height ≤ 0, exactly when `h2` was null.)

### 4.4 `src/features/dashboard/bodyMetrics.ts` — two edits

Add `import { normalizedFfmi } from '@/lib/ffmi'`. Replace the `startFfmi` block (lines 57–60):

```ts
const startFfmi =
  startLean !== null && h2 !== null && height !== null && height !== undefined
    ? startLean / h2 + 6.1 * (1.8 - height)
    : null
```

with:

```ts
const startFfmi =
  startLean !== null && height !== null && height !== undefined
    ? normalizedFfmi(startLean, height)
    : null
```

And in the `ffmi` metric object, replace `target: null,` with:

```ts
      target: settings.targets.ffmi ?? null,
```

### 4.5 `src/lib/schema.ts` — schema v3

1. Line 8: `export const SCHEMA_VERSION = 2` → `3`.
2. Targets line becomes:

```ts
  targets: z.object({ leanMassIncrease: nullableNumber, bodyFat: nullableNumber, ffmi: nullableNumber }),
```

3. `emptyState()` targets line becomes:

```ts
      targets: { leanMassIncrease: null, bodyFat: null, ffmi: null },
```

### 4.6 `src/lib/migrations.ts` — add one pipeline entry

Inside the existing `MIGRATIONS` record, after the `1:` entry, add:

```ts
  // v2 → v3 (E14): normalized-FFMI target.
  2: (doc) => {
    const settings = doc.settings as { targets?: Record<string, unknown> } | undefined
    if (settings?.targets !== undefined && settings.targets.ffmi === undefined) {
      settings.targets.ffmi = null
    }
  },
```

### 4.7 `src/lib/migrations.test.ts` — FULL replacement content

```ts
import { describe, expect, it } from 'vitest'
import { migrateToCurrent } from './migrations'
import { emptyState, SCHEMA_VERSION } from './schema'

/** A faithful document at an older version: current empty state minus later fields. */
function docAt(version: 1 | 2): Record<string, unknown> {
  const doc = JSON.parse(JSON.stringify(emptyState())) as {
    schemaVersion: number
    settings: { timer?: unknown; targets: Record<string, unknown> }
  }
  doc.schemaVersion = version
  delete doc.settings.targets.ffmi // v3 field
  if (version === 1) delete doc.settings.timer // v2 field
  return doc
}

describe('migration pipeline', () => {
  it('upgrades a v1 document through every step', () => {
    const result = migrateToCurrent(docAt(1))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.schemaVersion).toBe(SCHEMA_VERSION)
      expect(result.state.settings.timer).toEqual({ workSeconds: 60, restSeconds: 60 })
      expect(result.state.settings.targets.ffmi).toBeNull()
    }
  })

  it('upgrades a v2 document, keeping its timer and adding the ffmi target', () => {
    const doc = docAt(2)
    ;(doc.settings as { timer?: unknown }).timer = { workSeconds: 45, restSeconds: 90 }
    const result = migrateToCurrent(doc)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.migrated).toBe(true)
      expect(result.state.settings.timer).toEqual({ workSeconds: 45, restSeconds: 90 })
      expect(result.state.settings.targets.ffmi).toBeNull()
    }
  })

  it('never mutates the caller’s document', () => {
    const doc = docAt(1)
    migrateToCurrent(doc)
    expect(doc.schemaVersion).toBe(1)
  })

  it('passes a current document through unmigrated', () => {
    expect(migrateToCurrent(emptyState())).toMatchObject({ ok: true, migrated: false })
  })

  it('still rejects v0 and newer-than-current versions', () => {
    expect(migrateToCurrent({ schemaVersion: 0 }).ok).toBe(false)
    expect(migrateToCurrent({ schemaVersion: SCHEMA_VERSION + 1 }).ok).toBe(false)
  })
})
```

### 4.8 Validate & commit

Full pipeline + build + e2e (sample import now migrates v1→v3 in every spec).

```
git add src/lib/ffmi.ts src/lib/ffmi.test.ts src/lib/body.ts src/features/dashboard/bodyMetrics.ts src/lib/schema.ts src/lib/migrations.ts src/lib/migrations.test.ts
git commit -m "feat(body): FFMI inverse plan functions + stored FFMI target (schema v3)"
```

**AC:** [ ] goldens + inverse round-trip green · [ ] deriveBody/bodyMetrics results bit-identical to before (pure refactor; existing body/dashboard tests untouched and green) · [ ] SCHEMA_VERSION 3 with v1 AND v2 docs migrating · [ ] dashboard FFMI tile still says "No target set" (nothing sets the target yet).

---

## 5. Story US-105 — the estimator panel in Settings (M)

All edits in `src/features/more/SettingsPage.tsx`.

### 5.1 Imports

- Extend the `@/lib/body` import list with `ffmiCategory`.
- Add: `import { leanMassForFfmi, weightForLeanMass } from '@/lib/ffmi'`.

### 5.2 State — after `const [pendingProgram, setPendingProgram] = useState<ProgramKey | null>(null)` add:

```ts
// FFMI estimator drafts (E14) — FFMI as-is, body-fat as display percent
const [ffmiDraft, setFfmiDraft] = useState<number | null>(settings.targets.ffmi ?? null)
const [bfDraft, setBfDraft] = useState<number | null>(
  fractionToPercent(settings.targets.bodyFat ?? null),
)
const [pendingFfmi, setPendingFfmi] = useState(false)
```

### 5.3 Plan computation — after `const warnings = settingsWarnings(settings)` add:

```ts
// E14: everything below derives live from the two drafts + start stats. The
// applied lean-mass increase is the HONEST one (option A): implied lean minus
// start lean; the sheet's quirky target-weight formula stays the oracle and
// both weights are shown side by side.
const ffmiPlan = (() => {
  if (
    ffmiDraft === null ||
    bfDraft === null ||
    settings.height == null ||
    derived.startLean === null
  ) {
    return null
  }
  const bf = percentToFraction(bfDraft)
  const lean = ffmiDraft === null ? null : leanMassForFfmi(ffmiDraft, settings.height)
  if (bf === null || lean === null) return null
  const weight = weightForLeanMass(lean, bf)
  if (weight === null) return null
  const increase = Math.round((lean - derived.startLean) * 1000) / 1000
  return {
    lean,
    weight,
    increase,
    sheetTargetWeight: increase + derived.startLean + derived.startLean * bf,
  }
})()

function applyFfmiTargets() {
  if (ffmiPlan === null || ffmiDraft === null || bfDraft === null) return
  updateTargets({
    leanMassIncrease: ffmiPlan.increase,
    bodyFat: percentToFraction(bfDraft),
    ffmi: ffmiDraft,
  })
  setPendingFfmi(false)
}
```

### 5.4 Panel JSX — inside the Targets & limits `<Card>`, insert **between** the derived `<dl>…</dl>` (Target weight / Target BMI) **and** the `{warnings.length > 0 && …}` block:

```tsx
<div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
  <h3 className="text-sm font-semibold">Estimate from FFMI</h3>
  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
    Pick a normalized-FFMI goal and a plan body-fat; applying writes the target inputs above and
    stores the FFMI target for the dashboard. Uses the workbook&rsquo;s 6.1 normalization at 1.8 m.
  </p>
  <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
    <Row
      label="Target FFMI (normalized)"
      hint={
        ffmiDraft !== null ? `Category: ${ffmiCategory(ffmiDraft)}` : 'e.g. 20–22 = Above Average'
      }
    >
      <NumberField
        label="Target FFMI (normalized)"
        value={ffmiDraft}
        step={0.1}
        onChange={setFfmiDraft}
      />
    </Row>
    <Row label="FFMI plan body-fat (%)">
      <NumberField
        label="FFMI plan body-fat (%)"
        value={bfDraft}
        step={0.5}
        onChange={setBfDraft}
      />
    </Row>
  </div>
  {ffmiPlan !== null ? (
    <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Derived label="Lean mass (plan)" value={showWeight(ffmiPlan.lean)} unit={wUnit} />
      <Derived
        label="Lean gain"
        value={`${ffmiPlan.increase >= 0 ? '+' : ''}${formatFixed(
          kgToUnit(ffmiPlan.increase, units),
          1,
        )}`}
        unit={wUnit}
      />
      <Derived label="Implied weight" value={showWeight(ffmiPlan.weight)} unit={wUnit} />
      <Derived
        label="Sheet target (plan)"
        value={showWeight(ffmiPlan.sheetTargetWeight)}
        unit={wUnit}
      />
    </dl>
  ) : (
    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
      Set height, start weight and start body-fat (plus both fields above) to see the plan.
    </p>
  )}
  <button
    type="button"
    disabled={ffmiPlan === null}
    onClick={() => setPendingFfmi(true)}
    className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
  >
    Apply as targets
  </button>
</div>
```

### 5.5 Confirm modal — append after the `{pendingProgram && (…)}` block, same overlay pattern:

```tsx
{
  /* FFMI estimator apply confirm (E14) */
}
{
  pendingFfmi && ffmiPlan !== null && ffmiDraft !== null && bfDraft !== null && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm FFMI targets"
    >
      <Card className="max-w-md">
        <h2 className="text-base font-semibold">Apply FFMI-based targets?</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          This writes your target inputs: lean-mass increase{' '}
          <span className="font-medium">
            {formatFixed(kgToUnit(ffmiPlan.increase, units), 2)} {wUnit}
          </span>
          , target body-fat <span className="font-medium">{formatFixed(bfDraft, 1)}%</span> and FFMI
          target <span className="font-medium">{formatFixed(ffmiDraft, 1)}</span>. The sheet&rsquo;s
          target weight then derives from these, exactly as from hand-entered values.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={applyFfmiTargets}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Apply targets
          </button>
          <button
            type="button"
            onClick={() => setPendingFfmi(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </Card>
    </div>
  )
}
```

Label-collision check (pre-verified): `'FFMI plan body-fat (%)'` neither contains nor is contained by `'Target body-fat (%)'` or `'Upper body-fat limit (%)'`; `'Apply targets'` is not a substring of `'Apply as targets'`; tile labels `Lean mass (plan)` / `Lean gain` / `Implied weight` / `Sheet target (plan)` are unique page-wide.

### 5.6 Validate & commit

```
git add src/features/more/SettingsPage.tsx
git commit -m "feat(settings): estimate targets from a normalized-FFMI goal"
```

**AC:** [ ] panel renders inside Targets & limits with live category + four plan tiles · [ ] Apply is confirm-gated and writes exactly `{leanMassIncrease (honest, 3 dp), bodyFat, ffmi}` via `updateTargets` · [ ] missing start stats ⇒ helper text + disabled Apply · [ ] imperial mode re-displays plan tiles in lb (storage stays metric) · [ ] no schema/engine edits in this story.

---

## 6. Story US-106 — e2e journey (S)

### New file `e2e/ffmi-target.spec.ts` — EXACT content

```ts
import { expect, test, type Page } from '@playwright/test'

/**
 * FFMI target estimator (E14) on the sample dataset (1.8 m, 82 kg @ 22% →
 * normalized FFMI 19.74; latest weigh-in 80.8 kg @ 21.2% → 19.65). Plan:
 * FFMI 21 at 15% BF ⇒ lean 68.04 kg (+4.08), implied weight ~80.0 kg, sheet
 * target 77.6 kg; dashboard progress −7%.
 */

async function importSample(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-20T09:00:00') })
  await importSample(page)
})

test('estimates from an FFMI goal, applies targets, dashboard tracks progress', async ({
  page,
}) => {
  // before: the dashboard FFMI KPI has no target
  await page.goto('#/')
  const ffmiTile = page
    .locator('div.rounded-lg')
    .filter({ has: page.getByText('FFMI', { exact: true }) })
  await expect(ffmiTile.getByText('No target set')).toBeVisible()

  // settings → estimator
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: /Settings\s+Stats/ }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  const panel = page.locator('section').filter({ hasText: 'Estimate from FFMI' })
  const ffmiInput = page.getByRole('textbox', { name: 'Target FFMI (normalized)' })
  await ffmiInput.fill('21')
  await ffmiInput.blur()
  const bfInput = page.getByRole('textbox', { name: 'FFMI plan body-fat (%)' })
  await bfInput.fill('15')
  await bfInput.blur()

  await expect(page.getByText('Category: Above Average')).toBeVisible()
  const tile = (label: string) => panel.getByText(label, { exact: true }).locator('..')
  await expect(tile('Lean mass (plan)')).toContainText('68')
  await expect(tile('Lean gain')).toContainText('+4.1')
  await expect(tile('Implied weight')).toContainText('80')
  await expect(tile('Sheet target (plan)')).toContainText('77.6')

  await page.getByRole('button', { name: 'Apply as targets', exact: true }).click()
  await expect(page.getByText('Apply FFMI-based targets?')).toBeVisible()
  await page.getByRole('button', { name: 'Apply targets', exact: true }).click()
  await expect(page.getByText('Apply FFMI-based targets?')).toBeHidden()

  // the three raw inputs were written (honest lean increase, option A)
  await expect(page.getByRole('textbox', { name: 'Lean-mass increase (kg)' })).toHaveValue('4.08')
  await expect(page.getByRole('textbox', { name: 'Target body-fat (%)' })).toHaveValue('15')
  await expect(ffmiInput).toHaveValue('21')

  // dashboard: target + progress (19.65 now vs 19.74 start toward 21 → −7%)
  await page.goto('#/')
  await expect(ffmiTile.getByText('Target 21 · -7%')).toBeVisible()
})
```

(Hash navigation throughout — the in-memory store persists without waiting on the debounced write. If `'Target 21 · -7%'` mismatches, print the tile text — the -7 comes from `Math.round(-7.098…)`; do not loosen the assertion without reporting.)

```
git add e2e/ffmi-target.spec.ts
git commit -m "test(e2e): FFMI estimator journey — apply plan, dashboard tracks progress"
```

**AC:** [ ] journey green on chromium AND mobile · [ ] run `npm run build` before `npm run e2e` · [ ] `npm run lhci` ≥ 0.90 ×3 before the PR.

---

## 7. Story US-107 — docs & release (S)

1. Copy this file to `docs/epics/E14-ffmi-target-estimator.md`.
2. Append the E14 section to `docs/stories/README.md` (US-104..106 + write-up link, matching prior epics' format).
3. `npm version 1.5.0 --no-git-tag-version`
4. Prepend to `CHANGELOG.md` above the 1.4.0 entry:

```markdown
## 1.5.0 — <today's date, YYYY-MM-DD>

- **E14 — FFMI target estimator** (PR #<N>): Settings → Targets & limits can now
  derive your targets from a normalized-FFMI goal (workbook 6.1 normalization) —
  implied lean mass, lean gain and weight shown live, applied behind a confirm as
  the honest lean-mass increase + target body-fat + a stored FFMI target
  (schema v3) that the dashboard KPI and trends track.
```

5. Validate, then:

```
git add docs/epics/E14-ffmi-target-estimator.md docs/stories/README.md package.json package-lock.json CHANGELOG.md
git commit -m "docs(release): E14 epic doc, changelog 1.5.0, bump version"
git push -u origin claude/epic-e14-ffmi-target-estimator
```

PR `E14 — FFMI target estimator (v1.5.0)`, What/Why/How + AC checklists. Watch CI. **STOP — do not merge.**

## 8. Scenario matrix

| Scenario                                    | Expected                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Sample data, FFMI 21 @ 15%                  | lean 68.04 (+4.08), implied 80.0, sheet 77.6, category Above Average                                          |
| Apply → dashboard                           | FFMI tile `Target 21 · -7%` (below start and target); trends FFMI chart gains a target ref-line automatically |
| Target below current FFMI                   | negative/over-100 progress renders as computed — no clamping (matches other metrics' behavior)                |
| Missing height/start stats                  | helper text, Apply disabled, nothing written                                                                  |
| bf draft ≥ 100 % or < 0                     | `percentToFraction` → `weightForLeanMass` returns null ⇒ plan hidden, Apply disabled                          |
| Cancel in the modal                         | drafts kept, nothing written                                                                                  |
| Imperial units                              | plan tiles re-display in lb; applied values stored canonical metric                                           |
| v1/v2 imports after this epic               | migrate through the pipeline; `targets.ffmi` lands as null                                                    |
| Newer (v4+) document                        | still refused with the "newer app version" message                                                            |
| Existing settings e2e (`getByText('77.6')`) | untouched — that test never opens the estimator                                                               |

## 9. Out of scope

Changing the FFMI display constant (stays 6.1); estimating the weight/BMI **limits**; sex-specific category bands (workbook bands only); a dedicated FFMI trend page (the existing trends chart just gains its target line); back-solving option B (rejected — Q11).

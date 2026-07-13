import { expect, test, type Page } from '@playwright/test'

/** Import the v1 public fixture so this journey also exercises migration to schema v7. */
async function importSample(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  // UTC anchor plus playwright.config's Europe/Madrid timezone fixes local day 15.
  await page.clock.install({ time: new Date('2026-01-20T09:00:00Z') })
  await importSample(page)
})

test('today shows the P90X plan target from the latest weigh-in', async ({ page }) => {
  await page.goto('#/today')
  const plan = page.locator('section[aria-label="P90X plan"]')

  // Week 3 → training phase 1; latest weigh-in 80.8 kg → EA ≈ 2738 → Level II → 2400 kcal.
  await expect(plan.getByText('Phase 1 · Fat Shredder')).toBeVisible()
  await expect(plan.getByText('2,400')).toBeVisible()
  await expect(plan.getByText('kcal/day')).toBeVisible()

  // Fat Shredder split 50/30/20 at 2400 kcal → 300 g protein, 180 g carbs, 53 g fat.
  const macro = (label: string) => plan.locator('dt', { hasText: label }).locator('..')
  await expect(macro('Protein')).toContainText('300')
  await expect(macro('Protein')).toContainText('50%')
  await expect(macro('Carbs')).toContainText('180')
  await expect(macro('Fat')).toContainText('53')
  await expect(plan.getByText(/Level II \(energy amount ≈ 2,738 kcal/)).toBeVisible()
})

test('today shows the evidence-based target recommendation next to the P90X plan', async ({
  page,
}) => {
  await page.goto('#/today')
  const target = page.locator('section[aria-label="Your target"]')

  // Sample targets are a recomp: +4 kg lean AND body-fat 21.2% → 15%, so the
  // composition-aware engine budgets a real deficit even though the scale
  // barely moves (fatΔ ≈ −5.1 kg at 7700, leanΔ ≈ +4.3 kg at 1800 kcal/kg).
  await expect(target.getByText('Recomp', { exact: true })).toBeVisible()
  await expect(target.getByText('2,281')).toBeVisible()
  // Body-fat is logged, so lean mass is known → Katch–McArdle drives the TDEE.
  await expect(target.getByText(/Katch–McArdle TDEE/)).toBeVisible()
  // The footnote shows both weekly paces, not the misleading net-scale rate.
  await expect(target.getByText(/−0\.48 kg\/wk fat · \+0\.40 kg\/wk lean/)).toBeVisible()

  const macro = (label: string) => target.locator('dt', { hasText: label }).locator('..')
  // Protein raised to 2.2 g/kg while fat loss is intended; fat 0.8 g/kg; carbs as the fill.
  await expect(macro('Protein')).toContainText('2.2 g/kg')
  await expect(macro('Fat')).toContainText('0.8 g/kg')
  await expect(macro('Carbs')).toContainText('fill')
})

test('the low-carb diet style caps carbs and shifts the calories into fat', async ({ page }) => {
  await page.goto('#/more/settings')
  await page
    .getByRole('group', { name: 'Diet style' })
    .getByRole('button', { name: 'Low-carb' })
    .click()

  // Hash navigation keeps the in-memory store — today shows the capped split.
  await page.goto('#/today')
  const target = page.locator('section[aria-label="Your target"]')
  await expect(target.getByText('low-carb', { exact: true })).toBeVisible()
  const macro = (label: string) => target.locator('dt', { hasText: label }).locator('..')
  // Calories are unchanged (2,281): carbs stop at 130 g, fat absorbs the rest.
  await expect(target.getByText('2,281')).toBeVisible()
  await expect(macro('Carbs')).toContainText('130')
  await expect(macro('Carbs')).toContainText('capped')
  await expect(macro('Fat')).toContainText('1.4 g/kg')
})

test('settings read-outs and overrides drive the P90X target', async ({ page }) => {
  await page.goto('#/more/settings')
  await expect(page.getByRole('heading', { name: 'Nutrition' })).toBeVisible()

  // Derived read-outs from the guide formulas at the latest weigh-in.
  const derived = (label: string) => page.locator('dt', { hasText: label }).locator('..')
  await expect(derived('Energy amount')).toContainText('2,738')
  await expect(derived('Level')).toContainText('II')
  await expect(derived('Daily target')).toContainText('2,400')

  // The per-phase breakdown lives behind a progressive-disclosure details.
  await page.getByText('Macro breakdown & target-based plan').click()
  await expect(page.getByText('Phase 1 · Fat Shredder').locator('..')).toContainText('current')

  // A custom calorie target replaces the level plan…
  const calories = page.getByRole('textbox', { name: 'Custom daily calories (kcal)' })
  await calories.fill('2000')
  await calories.blur()
  await expect(derived('Daily target')).toContainText('2,000')

  // …and pinning a phase moves the split off the training blocks.
  await page
    .getByRole('group', { name: 'Nutrition phase' })
    .getByRole('button', { name: '3', exact: true })
    .click()
  await expect(page.getByText('Phase 3 · Endurance Maximizer').locator('..')).toContainText(
    'current',
  )

  // Hash navigation keeps the in-memory store — today now shows the overrides.
  await page.goto('#/today')
  const plan = page.locator('section[aria-label="P90X plan"]')
  await expect(plan.getByText('Phase 3 · Endurance Maximizer')).toBeVisible()
  await expect(plan.getByText('phase override')).toBeVisible()
  await expect(plan.getByText('2,000')).toBeVisible()
  const macro = (label: string) => plan.locator('dt', { hasText: label }).locator('..')
  // Endurance Maximizer 20/60/20 at 2000 kcal → 100 g protein, 300 g carbs, 44 g fat.
  await expect(macro('Protein')).toContainText('100')
  await expect(macro('Carbs')).toContainText('300')
  await expect(macro('Fat')).toContainText('44')
})

test('settings shows the target-based recommendation section', async ({ page }) => {
  await page.goto('#/more/settings')
  await page.getByText('Macro breakdown & target-based plan').click()
  const section = page.getByRole('region', { name: 'Target-based nutrition' })
  await expect(section).toBeVisible()
  await expect(section.getByText('Recomp', { exact: true })).toBeVisible()

  // Katch–McArdle BMR (lean mass known) feeds a ×1.55 TDEE and a deficit daily target.
  const derived = (label: string) => section.locator('dt', { hasText: label }).locator('..')
  await expect(derived('BMR')).toContainText('1,745')
  await expect(derived('TDEE')).toContainText('2,705')
  await expect(section.locator('li').filter({ hasText: 'Protein' })).toContainText('2.2 g/kg')
})

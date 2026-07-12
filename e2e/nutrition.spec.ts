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

test('today shows the phase calorie & macro target from the latest weigh-in', async ({ page }) => {
  await page.goto('#/today')
  const card = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Nutrition' }) })

  // Week 3 → training phase 1; latest weigh-in 80.8 kg → EA ≈ 2738 → Level II → 2400 kcal.
  await expect(page.getByText('Phase 1 · Fat Shredder')).toBeVisible()
  await expect(page.getByText('2,400')).toBeVisible()
  await expect(page.getByText('kcal/day')).toBeVisible()

  // Fat Shredder split 50/30/20 at 2400 kcal → 300 g protein, 180 g carbs, 53 g fat.
  const macro = (label: string) => card.locator('dt', { hasText: label }).locator('..')
  await expect(macro('Protein')).toContainText('300')
  await expect(macro('Protein')).toContainText('50%')
  await expect(macro('Carbs')).toContainText('180')
  await expect(macro('Carbs')).toContainText('30%')
  await expect(macro('Fat')).toContainText('53')
  await expect(macro('Fat')).toContainText('20%')
  await expect(page.getByText(/Level II \(energy amount ≈ 2,738 kcal/)).toBeVisible()
})

test('settings read-outs and overrides drive the target', async ({ page }) => {
  await page.goto('#/more/settings')
  await expect(page.getByRole('heading', { name: 'Nutrition' })).toBeVisible()

  // Derived read-outs from the guide formulas at the latest weigh-in.
  const derived = (label: string) => page.locator('dt', { hasText: label }).locator('..')
  await expect(derived('Energy amount')).toContainText('2,738')
  await expect(derived('Level')).toContainText('II')
  await expect(derived('Daily target')).toContainText('2,400')
  await expect(page.getByText('Phase 1 · Fat Shredder').locator('..')).toContainText('current')

  // A custom calorie target replaces the level plan…
  const calories = page.getByRole('textbox', { name: 'Custom daily calories (kcal)' })
  await calories.fill('2000')
  await calories.blur()
  await expect(derived('Daily target')).toContainText('2,000')
  await expect(derived('Daily target')).toContainText('custom')

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
  await expect(page.getByText('Phase 3 · Endurance Maximizer')).toBeVisible()
  await expect(page.getByText('phase override')).toBeVisible()
  await expect(page.getByText('2,000')).toBeVisible()
  const card = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Nutrition' }) })
  const macro = (label: string) => card.locator('dt', { hasText: label }).locator('..')
  // Endurance Maximizer 20/60/20 at 2000 kcal → 100 g protein, 300 g carbs, 44 g fat.
  await expect(macro('Protein')).toContainText('100')
  await expect(macro('Carbs')).toContainText('300')
  await expect(macro('Fat')).toContainText('44')
})

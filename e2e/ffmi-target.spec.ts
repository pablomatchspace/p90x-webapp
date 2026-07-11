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

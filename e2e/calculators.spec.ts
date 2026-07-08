import { expect, test, type Page } from '@playwright/test'

/**
 * Body-fat calculators (US-072). Imports the sample so gender (male) and age (40)
 * come from Settings, then checks the Navy method computes ~19.8% for a known body
 * and can seed the starting body-fat, and that the 3-site skinfold method computes
 * from site measurements (male 10/20/15 mm → 14.8%).
 */

async function openCalculators(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: /Body-fat calculators/ }).click()
  await expect(page.getByRole('heading', { name: 'Body-fat calculators' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
})

test('navy method computes body-fat and can seed the starting value', async ({ page }) => {
  await openCalculators(page)

  await page.getByRole('textbox', { name: /^Abdomen/ }).fill('90')
  await page.getByRole('textbox', { name: /^Neck/ }).fill('38')
  await page.getByRole('textbox', { name: /^Height/ }).fill('180')
  await expect(page.getByText('19.8')).toBeVisible()

  await page.getByRole('button', { name: 'Use as starting body-fat' }).click()
  await expect(page.getByText('Set starting body-fat?')).toBeVisible()
  await page.getByRole('button', { name: 'Save to Settings' }).click()
  await expect(page.getByText(/Saved 19\.8% as your starting body-fat/)).toBeVisible()
})

test('3-site skinfold method computes from site measurements', async ({ page }) => {
  await openCalculators(page)

  await page.getByRole('tab', { name: '3-site' }).click()
  await page.getByRole('textbox', { name: /^Chest/ }).fill('10')
  await page.getByRole('textbox', { name: /^Abdomen/ }).fill('20')
  await page.getByRole('textbox', { name: /^Thigh/ }).fill('15')

  // male 3-site 10/20/15 mm @ age 40 → 14.9%
  await expect(page.getByText('14.9')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Use as starting body-fat' })).toBeEnabled()
})

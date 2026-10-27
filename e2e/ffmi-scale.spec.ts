import { expect, test, type Page } from '@playwright/test'

/**
 * E40: the FFMI statistic + reference scale on the Body page and the dashboard.
 * Sample dataset: 1.8 m, start 82 kg @ 22% → FFMI 19.74; latest 80.8 kg @ 21.2% → 19.65.
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

test('Body page shows start → current → change with the reference scale', async ({ page }) => {
  await page.goto('#/body')
  const card = page.locator('section', {
    has: page.getByRole('heading', { name: 'FFMI', exact: true }),
  })
  const stat = (label: string) => card.locator('dt', { hasText: label }).locator('..')
  await expect(stat('Start')).toContainText('19.74')
  await expect(stat('Current')).toContainText('19.65')
  await expect(stat('Current')).toContainText('Above average')
  await expect(stat('Change')).toContainText('-0.09')
  await expect(stat('Target')).toContainText('—')
  await expect(
    card.getByRole('img', { name: /FFMI scale: Current FFMI 19\.65, Above average/ }),
  ).toBeVisible()
  // the legend names every band with its sourced edge
  await expect(card.getByText('Above the usual natural range')).toBeVisible()
  await card.getByText('Where these bands come from').click()
  await expect(card.getByText(/ESPEN 2015/)).toBeVisible()
})

test('dashboard carries the compact FFMI card with the scale', async ({ page }) => {
  await page.goto('#/')
  const scale = page.getByRole('img', { name: /FFMI scale: Current FFMI 19\.65/ })
  await expect(scale).toBeVisible()
  // compact: no band legend list
  await expect(page.getByText('Above the usual natural range')).toHaveCount(0)
})

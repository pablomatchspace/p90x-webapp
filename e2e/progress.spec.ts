import { expect, test, type Page } from '@playwright/test'

/**
 * Strength progression journeys (US-063) against the sample. Shoulders & Arms is
 * logged on d003 and d010; Side Tri-Rises is the biggest net jump (18 → 20, +2)
 * and tops the movers table. Uncheck-all / check-all mirror the Excel DATA-sheet
 * CheckAll toggle.
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

test('strength progression charts net per exercise with toggles and top movers', async ({
  page,
}) => {
  await page.goto('#/progress')
  await page.getByLabel('Workout').selectOption('shoulders-arms')

  await expect(page.getByRole('img', { name: /net score progression/ })).toBeVisible()

  // Side Tri-Rises is the biggest jump: 18 → 20 (+2), so it tops the movers table
  const topRow = page.getByRole('row', { name: /Side Tri-Rises/ })
  await expect(topRow).toContainText('18')
  await expect(topRow).toContainText('20')
  await expect(topRow).toContainText('+2')

  // uncheck-all clears the chart; check-all restores it (Excel CheckAll parity)
  await page.getByRole('button', { name: 'Uncheck all', exact: true }).click()
  await expect(page.getByText('No data yet')).toBeVisible()
  await page.getByRole('button', { name: 'Check all', exact: true }).click()
  await expect(page.getByRole('img', { name: /net score progression/ })).toBeVisible()
})

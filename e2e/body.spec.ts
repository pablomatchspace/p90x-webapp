import { expect, test, type Page } from '@playwright/test'

/**
 * Body-log journeys (US-050/051) against the fabricated sample dataset
 * (start 2026-01-05, 14 daily weigh-ins 2026-01-06..19). Clock pinned to
 * Jan 20 so "today" has no entry yet. Sample settings: 1.8 m, start 82 kg /
 * 22% BF, target 77.554 kg, limits 90 kg / 28 BMI. Latest weigh-in
 * (2026-01-19, 80.8 kg / 21.2%) derives BMI 24.94, FFMI 19.65 "Average".
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

test('body log lists imported entries with derivations and gap markers', async ({ page }) => {
  await page.goto('#/body')
  await expect(page.getByText('14 entries')).toBeVisible()

  // selecting the latest imported weigh-in populates the form and derives metrics
  await page.getByRole('button', { name: 'Edit 2026-01-19', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Weight (kg)' })).toHaveValue('80.8')
  await expect(page.getByText(/BMI 24\.94/).first()).toBeVisible()
  await expect(page.getByText(/FFMI 19\.65 \(Average\)/).first()).toBeVisible()

  // deleting a mid-series day exposes a visible gap in the history
  await page.getByRole('button', { name: 'Edit 2026-01-12', exact: true }).click()
  await page.getByRole('button', { name: 'Delete entry' }).click()
  await expect(page.getByText('13 entries')).toBeVisible()
  await expect(page.getByText('1 day without a weigh-in')).toBeVisible()
})

test('quick-add from Today logs a weigh-in with threshold coloring', async ({ page }) => {
  await page.goto('#/today')
  const quick = page.getByRole('textbox', { name: 'Weight (kg)' })
  await expect(quick).toBeVisible()
  await quick.fill('95') // over the 90 kg upper limit

  await page.goto('#/body')
  await expect(page.getByRole('textbox', { name: 'Weight (kg)' })).toHaveValue('95')
  await expect(page.getByText(/BMI 29\.32/).first()).toBeVisible()
  // an over-limit reading paints the derived readout red
  await expect(page.locator('[data-tone="over"]').first()).toBeVisible()
  await expect(page.getByText('15 entries')).toBeVisible()
})

import { expect, test, type Page } from '@playwright/test'

/**
 * Dashboard assembly (US-060) against the sample @ 2026-01-20 (program day 15).
 * Pulls together the program status, today's workout, body-vs-target KPIs, the
 * adherence roll-up (10/13 done), a deterministic quote of the day (day 15 →
 * built-in quote #16) and the entry points into the trend/strength charts.
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

test('dashboard assembles status, next-up, KPIs, adherence, quote and chart links', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByText('Day 15 of 90')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Log today' })).toBeVisible()

  await expect(page.getByText('Body vs targets')).toBeVisible()
  await expect(page.getByText('80.8', { exact: false }).first()).toBeVisible()

  await expect(page.getByText('Adherence & pace')).toBeVisible()
  await expect(page.getByText('10/13 done')).toBeVisible()

  // quote of the day is deterministic: program day 15 → built-in quote #16
  await expect(
    page.getByText('Motivation gets you dressed; discipline gets you done.'),
  ).toBeVisible()

  await expect(page.getByRole('link', { name: 'Trends →' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Strength →' })).toBeVisible()
})

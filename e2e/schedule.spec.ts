import { expect, test, type Page } from '@playwright/test'

/**
 * Schedule + Today journeys against the fabricated sample dataset
 * (start 2026-01-05, one skip on 2026-01-14). The browser clock is pinned
 * mid-program so "today" assertions are deterministic.
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

test('calendar shows 13 weeks, the skipped day, and program status', async ({ page }) => {
  await page.getByRole('link', { name: 'Schedule' }).first().click()

  await expect(page.getByText('Day 15 of 90')).toBeVisible() // status bar, Jan 20
  await expect(page.getByRole('region', { name: 'Week 1', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Week 13', exact: true })).toBeVisible()
  // the sample's skip op became a gap cell on Jan 14
  await expect(page.getByRole('link', { name: /Wed, Jan 14: skipped day/ })).toBeVisible()
  // one skip pushes the projected finish one day past planned
  await expect(page.getByText('+1 day', { exact: true })).toBeVisible()
})

test('today page shows the current workouts and quick-logs a cardio day', async ({ page }) => {
  await page.getByRole('link', { name: 'Today' }).first().click()

  // 2026-01-20 = program day 15 (week 3 starts): Chest & Back + Ab Ripper X
  await expect(page.getByText('Day 15 of 90 · Week 3 · Phase 1')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Chest & Back' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ab Ripper X' })).toBeVisible()

  // browse to the plyometrics day (Jan 6, day 2) and answer the COMPLETED? control
  await page.goto('#/day/2026-01-06')
  await expect(page.getByRole('heading', { name: 'Plyometrics' })).toBeVisible()
  await page.getByRole('button', { name: 'Yes', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Yes', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  // the quick log persists across a reload (debounced localStorage write)
  await page.waitForTimeout(500)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Yes', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('strength day mark-done flows through to the calendar color', async ({ page }) => {
  await page.goto('#/day/2026-01-20')
  const chestBack = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Chest & Back' }) })
  await chestBack.getByRole('button', { name: 'Mark done' }).click()
  await page.getByRole('button', { name: 'Mark done' }).click() // remaining card (ARX)
  await expect(page.getByRole('button', { name: 'Mark not done' })).toHaveCount(2)

  await page.getByRole('link', { name: 'Schedule' }).first().click()
  await expect(page.getByRole('link', { name: /Tue, Jan 20: .* — Done/ })).toBeVisible()
})

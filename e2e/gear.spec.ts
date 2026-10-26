import { expect, test, type Page } from '@playwright/test'

/**
 * E37 — gear / equipment per workout. Generation Next day 1 is today (Push
 * Strength: dumbbells + bench); Classic's first day is Chest & Back.
 */

async function start(page: Page, suite: RegExp) {
  await page.goto('#/start')
  await page.getByRole('radio', { name: suite }).click()
  await page.getByRole('button', { name: 'Start program' }).click()
  await expect(page).toHaveURL(/#\/today/)
}

test('Today card, week roll-up, list, detail and focus mode show the gear', async ({ page }) => {
  await start(page, /Generation Next/)

  // Today: the workout card names its gear, and the week roll-up unions the days
  await expect(page.getByText('Gear: Dumbbells · Bench').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Gear for the next 7 days' })).toBeVisible()
  await expect(page.getByText('Have ready:')).toBeVisible()

  // Workouts list + detail page
  await page.goto('#/workouts')
  await expect(page.getByText('No equipment needed').first()).toBeVisible()
  await page.goto('#/workouts/gn-pull-strength')
  await expect(page.getByText('Pull-up bar', { exact: true })).toBeVisible()

  // Focus mode keeps it on every step (a resumed session never misses it)
  await page.goto('#/today')
  await page.getByRole('link', { name: 'Log in focus mode' }).first().click()
  await expect(page.getByText('Step 1 of 39 · Round 1')).toBeVisible()
  await expect(page.getByText('Gear: Dumbbells · Bench')).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('Step 2 of 39 · Round 1')).toBeVisible()
  await expect(page.getByText('Gear: Dumbbells · Bench')).toBeVisible()
})

test('Classic: Chest & Back lists the pull-up bar; Kenpo X needs nothing', async ({ page }) => {
  await start(page, /Classic/)
  await expect(page.getByText(/Gear: .*Pull-up bar/).first()).toBeVisible()
  await page.goto('#/workouts/kenpo-x')
  await expect(page.getByText('No equipment needed')).toBeVisible()
})

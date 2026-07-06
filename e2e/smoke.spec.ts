import { expect, test } from '@playwright/test'

test('app shell renders with primary navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Workouts' }).first()).toBeVisible()
})

test('navigation reaches every area', async ({ page }) => {
  await page.goto('/')
  for (const area of ['Today', 'Schedule', 'Workouts', 'Body', 'More']) {
    await page.getByRole('link', { name: area }).first().click()
    await expect(page.getByRole('heading', { name: area })).toBeVisible()
  }
})

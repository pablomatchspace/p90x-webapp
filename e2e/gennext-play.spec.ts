import { expect, test } from '@playwright/test'

/**
 * E34 — Generation Next Play timelines: a completion day and a bonus fiver both
 * offer "Play workout" and open their authored interval timeline.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('#/start')
  await page.getByRole('radio', { name: /Generation Next/ }).click()
  await page.getByRole('button', { name: 'Start program' }).click()
  await expect(page).toHaveURL(/#\/today/)
})

test('Plyometrix (day 2) plays its authored timeline', async ({ page }) => {
  await page.goto('#/workouts/gn-plyometrix/play/d002')
  await expect(page.getByText('Segment 1 of 64')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Squat to Tiptoe Reach' })).toBeVisible()
})

test('a bonus fiver added on Today offers Play workout', async ({ page }) => {
  await page.getByRole('button', { name: '+ 5-Min Shoulders' }).click()
  await page.getByRole('link', { name: 'Play workout', exact: true }).click()
  await expect(page).toHaveURL(/gn-bonus-shoulders\/play\/d001/)
  await expect(page.getByText('Segment 1 of 7')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Arnie Press' })).toBeVisible()
})

import { expect, test, type Page } from '@playwright/test'

/**
 * E33 — P90X Generation Next journey: start Generation Next → log Push Strength
 * (block-grouped grid, 5-round finisher) → add a 5-minute bonus → complete the
 * round → start P90X Classic, plus the per-round program lock. Day 1 is today,
 * so Today shows Push Strength (calendar week 1 Monday).
 */

async function startGenerationNext(page: Page) {
  await page.goto('#/start')
  await page.getByRole('radio', { name: /Generation Next/ }).click()
  await expect(page.getByText(/Day 1: Push Strength/)).toBeVisible()
  await page.getByRole('button', { name: 'Start program' }).click()
  await expect(page).toHaveURL(/#\/today/)
}

test('Generation Next: start, log a 5-round finisher, bonus, archive, start Classic', async ({
  page,
}) => {
  await startGenerationNext(page)
  await expect(page.getByRole('heading', { name: 'Push Strength' })).toBeVisible()

  // Bonus add-on: logs done on this day, never part of the day's status
  await page.getByRole('button', { name: '+ 5-Min Abs' }).click()
  await expect(page.getByRole('heading', { name: 'Bonus: 5-Min Abs' })).toBeVisible()
  await expect(page.getByText('Optional bonus — never counts toward adherence.')).toBeVisible()

  // Log grid: tracker blocks and five finisher rounds of reps × weight
  await page.goto('#/workouts/gn-push-strength')
  for (const block of ['Block 1', 'Block 2', 'Finisher']) {
    await expect(page.getByRole('heading', { name: block, exact: true })).toBeVisible()
  }
  await page.getByRole('textbox', { name: 'Squat Thruster round 5 reps', exact: true }).fill('6')
  await page.getByRole('textbox', { name: 'Squat Thruster round 5 weight', exact: true }).fill('25')
  await page.getByRole('textbox', { name: 'Squat Thruster round 5 weight', exact: true }).blur()
  // R×W/10 = 6 × 25 / 10, one round entered
  await expect(page.getByLabel('Squat Thruster score: 15')).toBeVisible()

  // Workouts list groups the suite by pillar
  await page.goto('#/workouts')
  await expect(page.getByRole('heading', { name: 'Metabolic Overload (strength)' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '5-minute bonus' })).toHaveCount(0)

  // Other-suite deep links bounce back to the list
  await page.goto('#/workouts/chest-back')
  await expect(page).toHaveURL(/#\/workouts$/)

  // Complete the round, then start the next one as Classic
  await page.goto('#/rounds')
  await expect(page.getByText(/Generation Next · started/)).toBeVisible()
  await page.getByRole('button', { name: 'Complete round & archive…' }).click()
  await page.getByRole('button', { name: 'Archive round', exact: true }).click()
  await expect(page.getByText(/Round 1 archived/)).toBeVisible()
  await page.getByRole('link', { name: 'Start a program' }).click()
  await page.getByRole('radio', { name: /Classic/ }).click()
  await page.getByRole('button', { name: 'Start program' }).click()
  await expect(page.getByRole('heading', { name: 'Chest & Back' })).toBeVisible()

  // Different suites never pair up for round-over-round
  await page.goto('#/rounds/live')
  await expect(page.getByRole('heading', { name: 'Round report' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Round over round' })).toHaveCount(0)
})

test('E36: focus mode plays Push Strength round by round, with bodyweight moves', async ({
  page,
}) => {
  await startGenerationNext(page)
  await page.getByRole('link', { name: 'Log in focus mode' }).first().click()
  // 4 + 4 moves × 3 rounds, 3 finisher moves × 5 rungs = 39 one-round cards
  await expect(page.getByText('Step 1 of 39 · Round 1')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Goblet Squat round 1 reps' })).toBeVisible()

  const next = page.getByRole('button', { name: 'Next', exact: true })
  await next.click()
  await expect(page.getByText('Step 2 of 39 · Round 1')).toBeVisible()
  await page.getByRole('textbox', { name: 'Narrow to Wide Push-Up round 1 reps' }).fill('10')
  await page
    .getByRole('textbox', { name: 'Narrow to Wide Push-Up round 1 modified reps' })
    .fill('4')

  // after the block's 4th move, round 2 starts again at the first move
  await next.click()
  await next.click()
  await next.click()
  await expect(page.getByText('Step 5 of 39 · Round 2')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Goblet Squat round 2 reps' })).toBeVisible()
})

test('Generation Next is locked for the round in Settings', async ({ page }) => {
  await startGenerationNext(page)
  await page.goto('#/more/settings')
  await expect(page.getByText('Generation Next', { exact: true })).toBeVisible()
  await expect(page.getByText(/Locked for this round/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Switch to/ })).toHaveCount(0)
  await expect(page.getByText('Yoga timeline')).toHaveCount(0)
})

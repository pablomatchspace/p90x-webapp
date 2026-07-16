import { expect, test, type Page } from '@playwright/test'

/**
 * E29 overload-target journey. The sample data logs Chest & Back on its first
 * two occurrences (d001, d008), so focus mode on the third (d015) shows a
 * "beat last time (W2)" target for Standard Push-Ups that flips to beaten
 * once a big enough round-1 entry lands.
 */

async function importSample(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
}

test('focus mode shows a live overload target that flips to beaten', async ({ page }) => {
  await importSample(page)

  await page.goto('#/workouts/chest-back/focus/d015')
  await expect(page.getByRole('heading', { name: 'Standard Push-Ups' })).toBeVisible()

  // the target references the latest earlier logged occurrence (week 2)
  const targetLine = page.getByText(/Target: beat/)
  await expect(targetLine).toBeVisible()
  await expect(targetLine).toContainText('(last time, W2)')
  await expect(targetLine).not.toContainText('beaten')

  // a huge round-1 entry beats any sample net immediately
  const reps = page.getByRole('textbox', { name: 'Standard Push-Ups round 1 reps' })
  await reps.fill('99')
  await reps.blur()
  await expect(targetLine).toContainText('— beaten!')
})

test('first occurrence has no target; finish summary counts beaten targets', async ({ page }) => {
  await importSample(page)

  // chest-back d001 is the very first occurrence — nothing earlier to chase,
  // whatever step the logged session resumes on.
  await page.goto('#/workouts/chest-back/focus/d001')
  await expect(page.getByText(/Step \d+ of \d+/)).toBeVisible()
  await expect(page.getByText(/Target: beat/)).not.toBeVisible()

  // finish a targeted session (d015) and read the tally line
  await page.goto('#/workouts/chest-back/focus/d015')
  const reps = page.getByRole('textbox', { name: 'Standard Push-Ups round 1 reps' })
  await reps.fill('99')
  await reps.blur()
  // jump to the last step and finish
  while (await page.getByRole('button', { name: 'Next', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Next', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Finish workout' }).click()
  await expect(page.getByText('Workout complete 🎉')).toBeVisible()
  await expect(page.getByText(/Targets beaten:/)).toBeVisible()
  await expect(page.getByText(/Targets beaten:/)).toContainText('of')
})

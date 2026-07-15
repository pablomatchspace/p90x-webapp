import { expect, test, type Page } from '@playwright/test'

/**
 * Settings screen (US-070) against the sample @ 2026-01-20. Exercises the live
 * derived read-outs (target weight 77.6 kg), the units re-display (82 kg ⇄
 * 180.8 lb with no stored change), a live edit (80 kg → lean mass 62.4), and the
 * start-date re-anchor confirm that guards a program that already has data.
 */

async function openSettings(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: /Settings\s+Stats/ }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-20T09:00:00') })
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
})

test('shows derived read-outs and re-displays units without changing stored values', async ({
  page,
}) => {
  await openSettings(page)

  const weight = page.getByRole('textbox', { name: /^Start weight/ })
  await expect(weight).toHaveValue('82')

  // derived from the sample SETUP: target weight 77.6 kg, lean mass 64.0 kg
  await expect(page.getByText('77.6')).toBeVisible()

  // toggle to imperial: the same 82 kg re-displays as 180.8 lb (no stored change)
  await page.getByRole('group', { name: 'Units' }).getByRole('button', { name: 'Imperial' }).click()
  await expect(page.getByRole('textbox', { name: /^Start weight/ })).toHaveValue('180.8')

  // and back
  await page.getByRole('group', { name: 'Units' }).getByRole('button', { name: 'Metric' }).click()
  await expect(page.getByRole('textbox', { name: /^Start weight/ })).toHaveValue('82')
})

test('recomputes derived stats live as inputs change', async ({ page }) => {
  await openSettings(page)

  const weight = page.getByRole('textbox', { name: /^Start weight/ })
  await weight.fill('80')
  await weight.blur()

  // lean mass = 80 × (1 − 0.22) = 62.4
  await expect(page.getByText('62.4')).toBeVisible()
})

test('stores workout deeplinks and offers them as new-tab launch buttons (E23)', async ({
  page,
}) => {
  await openSettings(page)

  // paste a video link for Chest & Back; commit happens on blur
  const video = page.getByRole('textbox', { name: 'Chest & Back video link' })
  await video.fill('https://media.example/chest-back.mp4')
  await video.blur()

  // an invalid audio link is flagged inline and never stored
  const audio = page.getByRole('textbox', { name: 'Chest & Back audio link' })
  await audio.fill('not-a-url')
  await audio.blur()
  await expect(page.getByText('Enter a full http(s) link')).toBeVisible()

  // hash navigation keeps the in-memory store — no persistence flush needed.
  // 2026-01-05 is day 1 of the sample program: Chest & Back + Ab Ripper X.
  await page.goto('#/day/2026-01-05')
  const launch = page.getByRole('link', { name: 'Open Chest & Back video in a new tab' })
  await expect(launch).toBeVisible()
  await expect(launch).toHaveAttribute('href', 'https://media.example/chest-back.mp4')
  await expect(launch).toHaveAttribute('target', '_blank')
  await expect(launch).toHaveAttribute('rel', 'noopener noreferrer')
  // the rejected audio link produced no button
  await expect(
    page.getByRole('link', { name: 'Open Chest & Back audio in a new tab' }),
  ).toHaveCount(0)

  // the workout detail screen offers the same launch button
  await page.goto('#/workouts/chest-back')
  await expect(
    page.getByRole('link', { name: 'Open Chest & Back video in a new tab' }),
  ).toBeVisible()

  // E27: focus mode offers the same launch button next to its step controls
  await page.goto('#/workouts/chest-back/focus/d001')
  await expect(page.getByText(/Step \d+ of \d+/)).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Open Chest & Back video in a new tab' }),
  ).toBeVisible()

  // blanking the field removes the link and its button. openSettings reloads,
  // so flush the debounced persist first (frozen clock never ticks by itself).
  await page.clock.fastForward(500)
  await openSettings(page)
  const videoAgain = page.getByRole('textbox', { name: 'Chest & Back video link' })
  await videoAgain.fill('')
  await videoAgain.blur()
  await page.goto('#/day/2026-01-05')
  await expect(
    page.getByRole('link', { name: 'Open Chest & Back video in a new tab' }),
  ).toHaveCount(0)
})

test('confirms a start-date change on a program that already has data', async ({ page }) => {
  await openSettings(page)

  await page.getByLabel('Start date', { exact: true }).fill('2026-02-01')

  // re-anchoring a program with logged data must be confirmed, not silent
  await expect(page.getByText('Move your start date?')).toBeVisible()
  await expect(page.getByText(/shifts/)).toBeVisible()

  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Move your start date?')).toBeHidden()
  // cancelled → the original day 1 stands
  await expect(page.getByLabel('Start date', { exact: true })).toHaveValue('2026-01-05')
})

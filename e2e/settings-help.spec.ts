import { expect, test, type Page } from '@playwright/test'

/**
 * US-179: Settings keeps explanatory text behind tappable ⓘ buttons. Static
 * how-it-works copy is collapsed by default; warnings, live values, empty-state
 * prompts and the lock notice stay visible.
 */

async function openSettings(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: /Settings\s+Stats/ }).click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-20T09:00:00') })
})

test('static explanations are collapsed until the ⓘ is pressed', async ({ page }) => {
  await openSettings(page)

  // collapsed by default
  for (const text of [
    /Years spent regularly lifting/,
    /Weights and heights re-display instantly/,
    /Your day-1 baseline/,
    /Muscle you aim to add/,
    /Pick a normalized-FFMI goal/,
    /distinct from the boxed P90X plan/,
    /Divisors must stay above zero/,
    /Penalise a drop from round 1 to round 2/,
    /Paste a video and\/or audio link/,
  ]) {
    await expect(page.getByText(text)).toHaveCount(0)
  }

  // expands on press, collapses again
  const tip = page.getByRole('button', { name: 'More info: Training experience' })
  await expect(tip).toHaveAttribute('aria-expanded', 'false')
  await tip.click()
  await expect(tip).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText(/Years spent regularly lifting/)).toBeVisible()
  await tip.click()
  await expect(page.getByText(/Years spent regularly lifting/)).toHaveCount(0)
})

test('section intros, nutrition notes and scoring hints are reachable via ⓘ', async ({ page }) => {
  await openSettings(page)
  for (const [name, text] of [
    ['Your stats', /Your day-1 baseline/],
    ['Estimate from FFMI', /Pick a normalized-FFMI goal/],
    ['Nutrition', /daily calorie target, from your latest weigh-in/],
    ['Scoring', /Divisors must stay above zero/],
    ['Penalty divisor', /Divide the round 1→2 drop by this/],
    ['Workout links', /Paste a video and\/or audio link/],
  ] as const) {
    await page.getByRole('button', { name: `More info: ${name}`, exact: true }).click()
    await expect(page.getByText(text)).toBeVisible()
  }
})

test('live values, the lock notice and disclaimers stay visible without opening anything', async ({
  page,
}) => {
  await openSettings(page)
  await expect(page.getByText(/Locked for this round/)).toBeVisible()
  await expect(page.getByText(/Day 1 is /)).toBeVisible()
  await expect(page.getByText('e.g. 19–21 = Above average')).toBeVisible()

  // The Reality check verdicts and its disclaimer are results, not help.
  const ffmiInput = page.getByRole('textbox', { name: 'Target FFMI (normalized)' })
  await ffmiInput.fill('21')
  await ffmiInput.blur()
  const bfInput = page.getByRole('textbox', { name: 'FFMI plan body-fat (%)' })
  await bfInput.fill('15')
  await bfInput.blur()
  await expect(page.getByText(/Category: /)).toBeVisible()
  const panel = page.getByRole('region', { name: 'Reality check' })
  await expect(panel.getByText(/Not medical or coaching advice/)).toBeVisible()
  await expect(panel.getByText(/Muscle-sparing reference band/)).toHaveCount(0)
  await panel.getByRole('button', { name: 'More info: Fat-loss pace' }).click()
  await expect(panel.getByText(/Muscle-sparing reference band/)).toBeVisible()
})

test('the ⓘ is a comfortable touch target and fits the viewport', async ({ page }) => {
  await openSettings(page)
  const box = await page
    .getByRole('button', { name: 'More info: Training experience' })
    .boundingBox()
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(24)
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(24)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

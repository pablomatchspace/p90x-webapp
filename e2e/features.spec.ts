import { expect, test, type Page } from '@playwright/test'

/**
 * E41: More → Features switches optional parts of the app on and off. A switch
 * only hides entry points and surfaces; the data stays and pages stay reachable
 * by URL. Sample dataset @ 2026-01-20 (day 15, Chest & Back).
 */

async function importSample(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
}

async function setFeature(page: Page, name: string, on: boolean) {
  await page.goto('#/more/features')
  const toggle = page.getByRole('switch', { name, exact: true })
  await expect(toggle).toBeVisible()
  if ((await toggle.getAttribute('aria-checked')) !== String(on)) await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', String(on))
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-20T09:00:00') })
  await importSample(page)
})

test('the Features page lists every switchable feature, all on by default', async ({ page }) => {
  await page.goto('#/more')
  await page.getByRole('link', { name: /^Features\b/ }).click()
  await expect(page.getByRole('heading', { name: 'Features', exact: true })).toBeVisible()
  const switches = page.getByRole('switch')
  await expect(switches).toHaveCount(13)
  for (const sw of await switches.all()) await expect(sw).toHaveAttribute('aria-checked', 'true')
  for (const group of ['Sections', 'Cards and aids', 'Workout player']) {
    await expect(page.getByRole('heading', { name: group })).toBeVisible()
  }
})

test('turning a section off hides its More entry but keeps the page and its data', async ({
  page,
}) => {
  await page.goto('#/more/notes')
  await page.getByRole('textbox').first().fill('remember the pull-up bar')
  await page.clock.fastForward(500)

  await setFeature(page, 'Notes', false)
  await page.goto('#/more')
  await expect(page.getByRole('link', { name: /^Notes\b/ })).toHaveCount(0)
  // still reachable by URL, and the note is still there
  await page.goto('#/more/notes')
  await expect(page.getByRole('textbox').first()).toHaveValue('remember the pull-up bar')

  await setFeature(page, 'Notes', true)
  await page.goto('#/more')
  await expect(page.getByRole('link', { name: /^Notes\b/ })).toBeVisible()
})

test('rest timer, quotes and calculators each hide their More entry', async ({ page }) => {
  const entries = [
    ['Rest timer', /^Rest timer\b/],
    ['Motivation quotes', /^Motivation\b/],
    ['Body-fat calculators', /^Body-fat calculators\b/],
  ] as const
  for (const [feature, link] of entries) {
    await page.goto('#/more')
    await expect(page.getByRole('link', { name: link })).toBeVisible()
    await setFeature(page, feature, false)
    await page.goto('#/more')
    await expect(page.getByRole('link', { name: link })).toHaveCount(0)
  }
})

test('quotes off removes the dashboard quote card', async ({ page }) => {
  await page.goto('#/')
  await expect(page.getByText('Daily motivation')).toBeVisible()
  await setFeature(page, 'Motivation quotes', false)
  await page.goto('#/')
  await expect(page.getByText('Daily motivation')).toHaveCount(0)
})

test('adherence off removes the dashboard adherence card', async ({ page }) => {
  await page.goto('#/')
  await expect(page.getByRole('heading', { name: 'Adherence & pace' })).toBeVisible()
  await setFeature(page, 'Adherence card', false)
  await page.goto('#/')
  await expect(page.getByRole('heading', { name: 'Adherence & pace' })).toHaveCount(0)
})

test('trends off removes the links to the Trends and Progress charts', async ({ page }) => {
  await page.goto('#/')
  await expect(page.getByRole('link', { name: 'Trends →' })).toBeVisible()
  await setFeature(page, 'Trends and strength progress', false)
  await page.goto('#/')
  await expect(page.getByRole('link', { name: 'Trends →' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Strength →' })).toHaveCount(0)
  // the page itself is still reachable by URL
  await page.goto('#/trends')
  await expect(page.getByRole('heading', { name: /trends/i }).first()).toBeVisible()
})

test('FFMI off hides the card, the dashboard tile, the log value and the Settings estimator', async ({
  page,
}) => {
  await page.goto('#/body')
  await expect(page.getByRole('heading', { name: 'FFMI', exact: true })).toBeVisible()
  await page.goto('#/more/settings')
  await expect(page.getByText('Estimate from FFMI')).toBeVisible()

  await setFeature(page, 'FFMI', false)

  await page.goto('#/body')
  await expect(page.getByRole('heading', { name: 'FFMI', exact: true })).toHaveCount(0)
  await expect(page.getByText(/· FFMI /)).toHaveCount(0)
  await page.goto('#/')
  await expect(page.getByRole('heading', { name: 'FFMI', exact: true })).toHaveCount(0)
  await expect(page.getByText('FFMI', { exact: true })).toHaveCount(0)
  await page.goto('#/more/settings')
  await expect(page.getByText('Estimate from FFMI')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Reality check' })).toHaveCount(0)
})

test('nutrition off hides the Today card and the Settings section', async ({ page }) => {
  await page.goto('#/today')
  await expect(page.getByRole('heading', { name: 'Nutrition', exact: true })).toBeVisible()
  await setFeature(page, 'Nutrition', false)
  await page.goto('#/today')
  await expect(page.getByRole('heading', { name: 'Nutrition', exact: true })).toHaveCount(0)
  await page.goto('#/more/settings')
  await expect(page.getByRole('heading', { name: 'Nutrition', exact: true })).toHaveCount(0)
})

test('gear off hides the equipment lists on Today', async ({ page }) => {
  await page.goto('#/today')
  await expect(page.getByTestId('gear').first()).toBeVisible()
  await setFeature(page, 'Gear and equipment lists', false)
  await page.goto('#/today')
  await expect(page.getByTestId('gear')).toHaveCount(0)
})

test('workout links off hides the Settings Workout links card', async ({ page }) => {
  await page.goto('#/more/settings')
  await expect(page.getByRole('heading', { name: 'Workout links' })).toBeVisible()
  await setFeature(page, 'Workout video and audio links', false)
  await page.goto('#/more/settings')
  await expect(page.getByRole('heading', { name: 'Workout links' })).toHaveCount(0)
})

test('player features: rest timer card, overload target and voice cues toggle in Focus mode', async ({
  page,
}) => {
  await page.goto('#/workouts/chest-back/focus/d015')
  await expect(page.getByRole('heading', { name: 'Standard Push-Ups' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Rest timer' })).toBeVisible()
  await expect(page.getByText(/Target: beat/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Voice cues', exact: true })).toBeVisible()

  await setFeature(page, 'Rest timer', false)
  await setFeature(page, 'Progressive-overload targets', false)
  await setFeature(page, 'Beeps and spoken cues', false)
  await page.goto('#/workouts/chest-back/focus/d015')
  await expect(page.getByRole('heading', { name: 'Standard Push-Ups' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Rest timer' })).toHaveCount(0)
  await expect(page.getByText(/Target: beat/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Voice cues', exact: true })).toHaveCount(0)
})

test('voice entry off hides the microphone button', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeSpeechRecognition {
      start() {}
      abort() {}
      stop() {}
    }
    const w = window as unknown as Record<string, unknown>
    w.SpeechRecognition = FakeSpeechRecognition
    w.webkitSpeechRecognition = FakeSpeechRecognition
  })
  await page.clock.fastForward(500) // flush the persisted import, then boot with the stub installed
  await page.reload()
  await page.goto('#/workouts/chest-back/focus/d015')
  await expect(page.getByRole('button', { name: 'Voice entry' })).toBeVisible()
  await setFeature(page, 'Voice entry', false)
  await page.goto('#/workouts/chest-back/focus/d015')
  await expect(page.getByRole('heading', { name: 'Standard Push-Ups' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Voice entry' })).toHaveCount(0)
})

test('choices persist across a reload', async ({ page }) => {
  await setFeature(page, 'Notes', false)
  await page.clock.fastForward(500)
  await page.reload()
  await page.goto('#/more/features')
  await expect(page.getByRole('switch', { name: 'Notes', exact: true })).toHaveAttribute(
    'aria-checked',
    'false',
  )
})

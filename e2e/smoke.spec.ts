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

test('visual verification of all app hierarchical levels, click depths and interaction states', async ({
  page,
}) => {
  // Increase timeout for this long visual verification test
  test.setTimeout(120000)

  // Pin clock to make screenshots deterministic across test runs
  await page.clock.install({ time: new Date('2026-01-20T09:00:00') })

  // --- Click Depth Level 1: Empty / Clean State ---
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByText('No program yet')).toBeVisible()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('01-empty-dashboard.png', { maxDiffPixelRatio: 0.05 })

  await page.goto('#/start')
  await expect(page.getByRole('heading', { name: 'Start a program' })).toBeVisible()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('02-onboarding-empty.png', { maxDiffPixelRatio: 0.05 })

  // Go to import data page
  await page.goto('#/more/data')
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('03-more-data-empty.png', { maxDiffPixelRatio: 0.05 })

  // Import sample data
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()

  // --- Click Depth Level 2: Populated State Dashboard ---
  await page.goto('#/')
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot('04-dashboard-populated.png', { maxDiffPixelRatio: 0.05 })

  // --- Click Depth Level 2: Today Page & Interaction States ---
  await page.goto('#/today')
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot('05-today-populated.png', { maxDiffPixelRatio: 0.05 })

  // Skip modal on Today
  await page.goto('#/day/2026-01-21')
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Skip this day' }).click()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('06-today-skip-modal-open.png', { maxDiffPixelRatio: 0.05 })
  await page.getByRole('button', { name: 'Cancel' }).click() // Close modal

  // Swap modal on Today
  await page.getByRole('button', { name: 'Swap with another day' }).click()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('07-today-swap-modal-open.png', { maxDiffPixelRatio: 0.05 })
  await page.getByRole('button', { name: 'Cancel' }).click() // Close modal

  // --- Click Depth Level 3: Focus Mode Play/Pause States ---
  await page.goto('#/today')
  await page.getByRole('link', { name: 'Log in focus mode' }).first().click()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('08-focus-mode-idle.png', { maxDiffPixelRatio: 0.05 })

  // Click Work preset to change work duration
  await page.getByRole('button', { name: 'Work 45 s', exact: true }).click()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('09-focus-mode-preset-active.png', {
    maxDiffPixelRatio: 0.05,
  })

  // Start Playing
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('10-focus-mode-playing.png', { maxDiffPixelRatio: 0.05 })

  // Pause
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('11-focus-mode-paused.png', { maxDiffPixelRatio: 0.05 })

  // Stop
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await page.waitForTimeout(300)

  // Type reps input
  const repsInput = page.getByRole('textbox', { name: 'Standard Push-Ups round 1 reps' })
  await repsInput.fill('10')
  await repsInput.blur()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('12-focus-mode-with-input.png', { maxDiffPixelRatio: 0.05 })

  // --- Click Depth Level 2: Schedule & Sub-pages ---
  await page.goto('#/schedule')
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot('13-schedule-calendar.png', { maxDiffPixelRatio: 0.05 })

  // Weekly template editor
  await page.getByRole('link', { name: 'Weekly order' }).click()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('14-schedule-weekly-editor.png', { maxDiffPixelRatio: 0.05 })

  // Move a day
  await page.getByRole('button', { name: 'Move Chest & Back + Ab Ripper X down' }).click()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('15-schedule-weekly-editor-modified.png', {
    maxDiffPixelRatio: 0.05,
  })

  // Reschedule History/Audit
  await page.goto('#/schedule/history')
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('16-schedule-history.png', { maxDiffPixelRatio: 0.05 })

  // --- Click Depth Level 2: Workouts Grid Views ---
  await page.goto('#/workouts')
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('17-workouts-index.png', { maxDiffPixelRatio: 0.05 })

  // Detailed sheet grid (unfilled)
  await page.getByRole('link', { name: 'Chest & Back' }).first().click()
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot('18-workout-grid-unfilled.png', { maxDiffPixelRatio: 0.05 })

  // Grid editing / validation warning or highlights
  const gridCell = page.locator('input[type="text"]').first()
  await gridCell.fill('12')
  await gridCell.blur()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('19-workout-grid-filled.png', { maxDiffPixelRatio: 0.05 })

  // --- Click Depth Level 2: Body Log & Quick Add ---
  await page.goto('#/body')
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot('20-body-log.png', { maxDiffPixelRatio: 0.05 })

  // --- Click Depth Level 2: More sub-pages & interaction states ---
  await page.goto('#/more')
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('21-more-menu.png', { maxDiffPixelRatio: 0.05 })

  // Settings
  await page.goto('#/more/settings')
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('22-settings-base.png', { maxDiffPixelRatio: 0.05 })

  // Settings FFMI Estimator
  const settingsFfmiInput = page.getByRole('textbox', { name: 'Target FFMI (normalized)' })
  await settingsFfmiInput.fill('21')
  await settingsFfmiInput.blur()
  const settingsBfInput = page.getByRole('textbox', { name: 'FFMI plan body-fat (%)' })
  await settingsBfInput.fill('15')
  await settingsBfInput.blur()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('23-settings-ffmi-plan-filled.png', {
    maxDiffPixelRatio: 0.05,
  })

  // Settings Estimator Modal
  await page.getByRole('button', { name: 'Apply as targets', exact: true }).click()
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('24-settings-ffmi-modal-open.png', {
    maxDiffPixelRatio: 0.05,
  })
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()

  // Calculators page empty Navy
  await page.goto('#/more/calculators')
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('25-calculators-navy-empty.png', { maxDiffPixelRatio: 0.05 })

  // Skinfold calculator filled
  await page.getByRole('tab', { name: '3-site', exact: true }).click()
  // Fill in measurements
  const chestInput = page.getByRole('textbox', { name: /chest/i })
  if (await chestInput.isVisible()) {
    await chestInput.fill('12')
    await page.getByRole('textbox', { name: /abdomen/i }).fill('18')
    await page.getByRole('textbox', { name: /thigh/i }).fill('20')
    await page.waitForTimeout(300)
    await expect(page).toHaveScreenshot('26-calculators-skinfold-filled.png', {
      maxDiffPixelRatio: 0.05,
    })
  }

  // Standalone timer
  await page.goto('#/more/timer')
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('27-more-timer.png', { maxDiffPixelRatio: 0.05 })

  // Quotes Pack Editor
  await page.goto('#/more/quotes')
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('28-more-quotes.png', { maxDiffPixelRatio: 0.05 })

  // Personal Notes
  await page.goto('#/more/notes')
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('29-more-notes.png', { maxDiffPixelRatio: 0.05 })

  // Cloud Sync Settings
  await page.goto('#/more/sync')
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('30-more-sync.png', { maxDiffPixelRatio: 0.05 })

  // Help abbreviations & Version info
  await page.goto('#/more/help')
  await page.waitForTimeout(300)
  await expect(page).toHaveScreenshot('31-more-help.png', { maxDiffPixelRatio: 0.05 })
})

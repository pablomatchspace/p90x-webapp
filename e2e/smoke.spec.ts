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

  // Anchor the frozen clock in UTC (the `Z`) so the rendered time is identical
  // regardless of Node's local tz; the config's timezoneId then renders it in a
  // fixed zone. Timer states advance this clock explicitly via clock.fastForward
  // (see e2e/focus-play.spec.ts) — a frozen clock never ticks on its own.
  await page.clock.install({ time: new Date('2026-01-20T09:00:00Z') })

  // The clock is frozen on this local-calendar day.
  const PINNED_DAY = '2026-01-20'
  // One calendar day after the pinned day — the skip/swap modals must act on a
  // non-today entry. Derived from PINNED_DAY in pure UTC (fixed components, no
  // local-tz/DST drift) rather than a bare magic string.
  const [py, pm, pd] = PINNED_DAY.split('-').map(Number)
  const DAY_AFTER_PINNED = new Date(Date.UTC(py, pm - 1, pd + 1)).toISOString().slice(0, 10)

  // Every screenshot is soft (so all 31 comparisons run and report even if an
  // earlier one diffs) and fullPage (so content below the fold is verified too).
  // Functional gates (toBeVisible, clicks, fills) stay hard.

  // --- Click Depth Level 1: Empty / Clean State ---
  await test.step('01 empty dashboard', async () => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByText('No program yet')).toBeVisible()
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('01-empty-dashboard.png', { fullPage: true })
  })

  await test.step('02 onboarding empty', async () => {
    await page.goto('#/start')
    await expect(page.getByRole('heading', { name: 'Start a program' })).toBeVisible()
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('02-onboarding-empty.png', { fullPage: true })
  })

  await test.step('03 more data empty', async () => {
    await page.goto('#/more/data')
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('03-more-data-empty.png', { fullPage: true })
  })

  // Import sample data
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()

  // --- Click Depth Level 2: Populated State Dashboard ---
  await test.step('04 dashboard populated', async () => {
    await page.goto('#/')
    await page.waitForTimeout(500)
    await expect.soft(page).toHaveScreenshot('04-dashboard-populated.png', { fullPage: true })
  })

  // --- Click Depth Level 2: Today Page & Interaction States ---
  await test.step('05 today populated', async () => {
    await page.goto('#/today')
    await page.waitForTimeout(500)
    await expect.soft(page).toHaveScreenshot('05-today-populated.png', { fullPage: true })
  })

  // Skip modal on Today
  await test.step('06 today skip modal open', async () => {
    await page.goto(`#/day/${DAY_AFTER_PINNED}`)
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Skip this day' }).click()
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('06-today-skip-modal-open.png', { fullPage: true })
    await page.getByRole('button', { name: 'Cancel' }).click() // Close modal
  })

  // Swap modal on Today
  await test.step('07 today swap modal open', async () => {
    await page.getByRole('button', { name: 'Swap with another day' }).click()
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('07-today-swap-modal-open.png', { fullPage: true })
    await page.getByRole('button', { name: 'Cancel' }).click() // Close modal
  })

  // --- Click Depth Level 3: Focus Mode Play/Pause States ---
  await test.step('08 focus mode idle', async () => {
    await page.goto('#/today')
    await page.getByRole('link', { name: 'Log in focus mode' }).first().click()
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('08-focus-mode-idle.png', { fullPage: true })
  })

  // Click Work preset to change work duration
  await test.step('09 focus mode preset active', async () => {
    await page.getByRole('button', { name: 'Work 45 s', exact: true }).click()
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('09-focus-mode-preset-active.png', { fullPage: true })
  })

  // F4: start playing, then advance the frozen clock so real elapsed time renders
  // (playback is now-driven, src/lib/playback.ts). 5 s and 8 s both sit inside the
  // 45 s work phase, so the two shots differ in elapsed time, not just the glyph.
  await test.step('10 focus mode playing', async () => {
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await page.clock.fastForward(5_000) // deterministic: exactly 5s elapsed
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('10-focus-mode-playing.png', { fullPage: true })
  })

  await test.step('11 focus mode paused', async () => {
    await page.clock.fastForward(3_000) // 8s elapsed — differs in time, not just glyph
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('11-focus-mode-paused.png', { fullPage: true })
  })

  // Stop
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await page.waitForTimeout(300)

  // Type reps input
  await test.step('12 focus mode with input', async () => {
    const repsInput = page.getByRole('textbox', { name: 'Standard Push-Ups round 1 reps' })
    await repsInput.fill('10')
    await repsInput.blur()
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('12-focus-mode-with-input.png', { fullPage: true })
  })

  // --- Click Depth Level 2: Schedule & Sub-pages ---
  await test.step('13 schedule calendar', async () => {
    await page.goto('#/schedule')
    await page.waitForTimeout(500)
    await expect.soft(page).toHaveScreenshot('13-schedule-calendar.png', { fullPage: true })
  })

  // Weekly template editor
  await test.step('14 schedule weekly editor', async () => {
    await page.getByRole('link', { name: 'Weekly order' }).click()
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('14-schedule-weekly-editor.png', { fullPage: true })
  })

  // Move a day
  await test.step('15 schedule weekly editor modified', async () => {
    await page.getByRole('button', { name: 'Move Chest & Back + Ab Ripper X down' }).click()
    await page.waitForTimeout(300)
    await expect
      .soft(page)
      .toHaveScreenshot('15-schedule-weekly-editor-modified.png', { fullPage: true })
  })

  // Reschedule History/Audit
  await test.step('16 schedule history', async () => {
    await page.goto('#/schedule/history')
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('16-schedule-history.png', { fullPage: true })
  })

  // --- Click Depth Level 2: Workouts Grid Views ---
  await test.step('17 workouts index', async () => {
    await page.goto('#/workouts')
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('17-workouts-index.png', { fullPage: true })
  })

  // Detailed sheet grid (unfilled)
  await test.step('18 workout grid unfilled', async () => {
    await page.getByRole('link', { name: 'Chest & Back' }).first().click()
    await page.waitForTimeout(500)
    await expect.soft(page).toHaveScreenshot('18-workout-grid-unfilled.png', { fullPage: true })
  })

  // Grid editing / validation warning or highlights
  await test.step('19 workout grid filled', async () => {
    const gridCell = page.locator('input[type="text"]').first()
    await gridCell.fill('12')
    await gridCell.blur()
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('19-workout-grid-filled.png', { fullPage: true })
  })

  // --- Click Depth Level 2: Body Log & Quick Add ---
  await test.step('20 body log', async () => {
    await page.goto('#/body')
    await page.waitForTimeout(500)
    await expect.soft(page).toHaveScreenshot('20-body-log.png', { fullPage: true })
  })

  // --- Click Depth Level 2: More sub-pages & interaction states ---
  await test.step('21 more menu', async () => {
    await page.goto('#/more')
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('21-more-menu.png', { fullPage: true })
  })

  // Settings
  await test.step('22 settings base', async () => {
    await page.goto('#/more/settings')
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('22-settings-base.png', { fullPage: true })
  })

  // Settings FFMI Estimator
  await test.step('23 settings ffmi plan filled', async () => {
    const settingsFfmiInput = page.getByRole('textbox', { name: 'Target FFMI (normalized)' })
    await settingsFfmiInput.fill('21')
    await settingsFfmiInput.blur()
    const settingsBfInput = page.getByRole('textbox', { name: 'FFMI plan body-fat (%)' })
    await settingsBfInput.fill('15')
    await settingsBfInput.blur()
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('23-settings-ffmi-plan-filled.png', { fullPage: true })
  })

  // Settings Estimator Modal
  await test.step('24 settings ffmi modal open', async () => {
    await page.getByRole('button', { name: 'Apply as targets', exact: true }).click()
    // The confirm overlay is position:fixed, so a fullPage capture stitches it at
    // the current scroll offset — pin the scroll to keep the shot deterministic
    // (the E23 Workout links card made the page long enough for this to vary).
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('24-settings-ffmi-modal-open.png', { fullPage: true })
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  })

  // Calculators page empty Navy
  await test.step('25 calculators navy empty', async () => {
    await page.goto('#/more/calculators')
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('25-calculators-navy-empty.png', { fullPage: true })
  })

  // F3: skinfold calculator filled — unconditional, with a hard visibility gate so
  // a missing input FAILS rather than silently skips. Sample data is male, so the
  // 3-site sites are Chest/Abdomen/Thigh (src/lib/bodyFat.ts THREE_SITE_SITES);
  // NumberField renders each as an aria-label of `<Site> (mm)`. Exact names avoid
  // the getByLabel substring pitfall (would also hit "Increase/Decrease <Site> (mm)").
  await test.step('26 calculators skinfold filled', async () => {
    await page.getByRole('tab', { name: '3-site', exact: true }).click()
    const chestInput = page.getByRole('textbox', { name: 'Chest (mm)', exact: true })
    await expect(chestInput).toBeVisible() // hard gate — a missing input must FAIL, not skip
    await chestInput.fill('12')
    await page.getByRole('textbox', { name: 'Abdomen (mm)', exact: true }).fill('18')
    await page.getByRole('textbox', { name: 'Thigh (mm)', exact: true }).fill('20')
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('26-calculators-skinfold-filled.png', {
      fullPage: true,
    })
  })

  // Standalone timer
  await test.step('27 more timer', async () => {
    await page.goto('#/more/timer')
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('27-more-timer.png', { fullPage: true })
  })

  // Quotes Pack Editor
  await test.step('28 more quotes', async () => {
    await page.goto('#/more/quotes')
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('28-more-quotes.png', { fullPage: true })
  })

  // Personal Notes
  await test.step('29 more notes', async () => {
    await page.goto('#/more/notes')
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('29-more-notes.png', { fullPage: true })
  })

  // Cloud Sync Settings
  await test.step('30 more sync', async () => {
    await page.goto('#/more/sync')
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('30-more-sync.png', { fullPage: true })
  })

  // Help abbreviations & Version info
  await test.step('31 more help', async () => {
    await page.goto('#/more/help')
    await page.waitForTimeout(300)
    await expect.soft(page).toHaveScreenshot('31-more-help.png', { fullPage: true })
  })
})

import { expect, test } from '@playwright/test'

/**
 * Help / About (US-074): the abbreviations legend (from INSTRUCTIONS), the
 * audio & voice guide (E26 cues + E30 voice entry), the local-only privacy
 * note — including E10's one opt-in exception to it — and the version + repo
 * link. Static content — no import.
 */
test('help page shows abbreviations, audio guide, privacy note and version', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  // The one-time "ready to work offline" toast is pinned bottom-centre and swallows
  // clicks on the lower cards of the mobile viewport (the E8 pitfall).
  await page
    .getByRole('button', { name: 'OK' })
    .click({ timeout: 3000 })
    .catch(() => {})
  await page.getByRole('link', { name: /Help\s+Abbreviations/ }).click()
  await expect(page.getByRole('heading', { name: /Help/ })).toBeVisible()

  // abbreviations legend
  await expect(page.getByText('NC / C')).toBeVisible()
  await expect(page.getByText(/no chair \/ chair-assisted/i)).toBeVisible()
  await expect(page.getByText('RA / LA')).toBeVisible()

  // audio guide: E26 cues and the E30 voice-entry phrasebook
  await expect(page.getByRole('heading', { name: 'Audio & voice' })).toBeVisible()
  await expect(page.getByText('“reps 22, knee 8”')).toBeVisible()
  await expect(page.getByText('“finish workout”')).toBeVisible()
  await expect(page.getByText(/re-arms after every phrase/i)).toBeVisible()

  // local-only privacy stance, and the one opt-in exception (cloud sync, E10)
  await expect(page.getByText(/nothing is uploaded anywhere/i)).toBeVisible()
  await expect(page.getByText(/off unless you turn it on/i)).toBeVisible()

  // version + source
  await expect(page.getByText('Version', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'GitHub repository' })).toBeVisible()
})

/**
 * E39: Help → About has a "Check for updates" button. Against the built app the
 * service worker is registered, so a check with nothing newer deployed says so;
 * offline it explains instead of failing silently.
 */
test('help page checks for updates', async ({ page, context }) => {
  await page.goto('#/more/help')
  await expect(page.getByRole('heading', { name: /Help/ })).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready) // registration handed to the bridge
  await page
    .getByRole('button', { name: 'OK' })
    .click({ timeout: 3000 })
    .catch(() => {})

  const check = page.getByRole('button', { name: 'Check for updates' })
  await check.scrollIntoViewIfNeeded()
  await check.click()
  await expect(page.getByText('You’re on the latest version.')).toBeVisible()

  await context.setOffline(true)
  await check.click()
  await expect(page.getByText(/You’re offline/)).toBeVisible()
  await context.setOffline(false)
})

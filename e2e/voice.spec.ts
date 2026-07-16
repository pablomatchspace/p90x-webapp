import { expect, test, type Page } from '@playwright/test'

/**
 * E30 voice-entry journey. A stubbed `webkitSpeechRecognition` (installed
 * before boot) lets the test feed transcripts through the real parse →
 * assign → setRoundValue pipeline: field words fill the named inputs,
 * "next" steps the card, "finish workout" completes the session, and
 * hands-free re-arms the mic between utterances.
 */

interface StubWindow {
  webkitSpeechRecognition?: unknown
  SpeechRecognition?: unknown
  __rec?: {
    onresult: ((event: { results: { transcript: string }[][] }) => void) | null
    onend: (() => void) | null
  } | null
}

async function stubRecognition(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as StubWindow
    class FakeSpeechRecognition {
      lang = ''
      continuous = false
      interimResults = false
      onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null
      onerror: ((event: { error: string }) => void) | null = null
      onend: (() => void) | null = null
      start() {
        w.__rec = this
      }
      abort() {
        if (w.__rec === this) w.__rec = null
      }
      stop() {
        this.onend?.()
      }
    }
    w.SpeechRecognition = FakeSpeechRecognition
    w.webkitSpeechRecognition = FakeSpeechRecognition
  })
}

/** Deliver one final transcript to the armed recognizer, then end the session. */
async function speak(page: Page, transcript: string) {
  await page.evaluate((text) => {
    const rec = (window as unknown as StubWindow).__rec
    if (rec === null || rec === undefined) throw new Error('no active recognition')
    rec.onresult?.({ results: [[{ transcript: text }]] })
    rec.onend?.()
  }, transcript)
}

async function importSample(page: Page) {
  await page.goto('/')
  await page.getByRole('link', { name: 'More' }).first().click()
  await page.getByRole('link', { name: 'Data Import your Excel conversion' }).click()
  await page.getByRole('button', { name: 'Try sample data' }).click()
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await expect(page.getByText(/Imported sample dataset/)).toBeVisible()
}

test('push-to-talk fills named fields, steps cards and finishes', async ({ page }) => {
  await stubRecognition(page)
  await importSample(page)

  await page.goto('#/workouts/chest-back/focus/d015')
  await expect(page.getByRole('heading', { name: 'Standard Push-Ups' })).toBeVisible()

  const mic = page.getByRole('button', { name: 'Voice entry' })
  await mic.click()
  await expect(page.getByRole('button', { name: 'Listening…' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await speak(page, 'reps 22 knee 8')
  await expect(page.getByText('Logged reps 22 · knee reps 8.')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Standard Push-Ups round 1 reps' })).toHaveValue(
    '22',
  )
  await expect(
    page.getByRole('textbox', { name: 'Standard Push-Ups round 1 knee reps' }),
  ).toHaveValue('8')
  // push-to-talk disarms after the utterance
  await expect(mic).toHaveAttribute('aria-pressed', 'false')

  await mic.click()
  await speak(page, 'next')
  await expect(page.getByRole('heading', { name: 'Wide Front Pull-Ups' })).toBeVisible()

  await mic.click()
  await speak(page, 'finish workout')
  await expect(page.getByText('Workout complete 🎉')).toBeVisible()
})

test('hands-free re-arms between utterances', async ({ page }) => {
  await stubRecognition(page)
  await importSample(page)

  await page.goto('#/workouts/chest-back/focus/d015')
  await page.getByRole('button', { name: 'Hands-free' }).click()
  await page.getByRole('button', { name: 'Voice entry' }).click()

  await speak(page, '22')
  await expect(page.getByRole('textbox', { name: 'Standard Push-Ups round 1 reps' })).toHaveValue(
    '22',
  )
  // still listening — the second utterance needs no tap
  await expect(page.getByRole('button', { name: 'Listening…' })).toBeVisible()
  await speak(page, '8')
  await expect(
    page.getByRole('textbox', { name: 'Standard Push-Ups round 1 knee reps' }),
  ).toHaveValue('8')
})

test('voice "next" during playback routes through the skip path', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-20T09:00:00') })
  await stubRecognition(page)
  await importSample(page)

  await page.goto('#/workouts/chest-back/focus/d015')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByText('Work', { exact: true })).toBeVisible()

  const mic = page.getByRole('button', { name: 'Voice entry' })
  // "next" mid-work skips the phase like the Skip button — rest on the same step
  await mic.click()
  await speak(page, 'next')
  await expect(page.getByText(/Rest — up next: Wide Front Pull-Ups/)).toBeVisible()
  await expect(page.getByText('Step 1 of 24 · Round 1')).toBeVisible()

  // and again during rest → the sequence itself advances to step 2
  await mic.click()
  await speak(page, 'next')
  await expect(page.getByText('Step 2 of 24 · Round 1')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Wide Front Pull-Ups' })).toBeVisible()

  // the timer keeps driving the SAME position — no snap-back on the next tick
  await page.clock.fastForward(1_000)
  await expect(page.getByText('Step 2 of 24 · Round 1')).toBeVisible()

  // "finish workout" stops the timer and completes the session
  await mic.click()
  await speak(page, 'finish workout')
  await expect(page.getByText('Workout complete 🎉')).toBeVisible()
  await expect(page.getByRole('timer', { name: 'Sequence time remaining' })).not.toBeVisible()
})

test('mic is absent when SpeechRecognition is unsupported', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as StubWindow
    w.SpeechRecognition = undefined
    w.webkitSpeechRecognition = undefined
  })
  await importSample(page)

  await page.goto('#/workouts/chest-back/focus/d015')
  await expect(page.getByRole('heading', { name: 'Standard Push-Ups' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Voice entry' })).not.toBeVisible()
})

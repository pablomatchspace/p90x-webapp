# Epic E15 — Playwright test device replacement & UI validation

> **Status:** SHIPPED · **Story:** US-108 · **Branch:** `antigravity/chore-realme-device`
> **Ships as:** app version **1.5.1** (patch bump)
> **One-liner:** Replace the emulated test device Pixel 7 with a custom realme 16 Pro+ profile, ensuring Playwright verifies UI issues visible in screens for both desktop and the specific mobile device defined.

## Final Requirements

1. **Custom Emulation Profile**:
   - Emulated device: `realme 16 Pro+` (RMX5131).
   - Logical viewport: `width: 412, height: 902` (aspect ratio 19.5:9 matching its physical `1280x2800` display).
   - Scale factor: `3.1` (~453 ppi).
   - User Agent: Chrome-on-Android containing the physical device identifier `RMX5131`.
2. **UI & Visual Verification**:
   - Playwright must verify visible UI issues on screens for both desktop and the custom mobile device.
   - Verification must cover **every screen hierarchical level (click depth)**.
   - Verification must cover **every state** (clean empty state, populated sample state, modals open, calculators filled, focus play/pause).

---

## Implementation Details

### Playwright Custom Emulation

In [playwright.config.ts](file:///c:/Users/pablo/OneDrive/Documents/Claude/Projects/P90X%20App%20%28Fable%29/p90x-webapp/playwright.config.ts), we replaced the default `Pixel 7` device with a custom profile:

```typescript
{
  name: 'realme 16 Pro+',
  use: {
    browserName: 'chromium',
    viewport: { width: 412, height: 902 },
    deviceScaleFactor: 3.1,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; RMX5131 Build/UKQ1.230924.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  },
}
```

### Visual Verification Test Suite

In [e2e/smoke.spec.ts](file:///c:/Users/pablo/OneDrive/Documents/Claude/Projects/P90X%20App%20%28Fable%29/p90x-webapp/e2e/smoke.spec.ts), we implemented a multi-stage visual verification suite comprising **31 distinct screenshots** captured on both desktop and mobile:

- **Clean/Empty State (Click Depth 1)**:
  - Dashboard (NoProgramCard empty state) -> `01-empty-dashboard.png`
  - Onboarding screen -> `02-onboarding-empty.png`
  - Data Import screen -> `03-more-data-empty.png`
- **Populated State (Click Depth 2)**:
  - Dashboard (populated with sample charts and KPIs) -> `04-dashboard-populated.png`
  - Today view -> `05-today-populated.png`
  - Rescheduling modals (Skip modal & Swap modal overlays) -> `06-today-skip-modal-open.png`, `07-today-swap-modal-open.png`
- **Focus Workout Playback (Click Depth 3)**:
  - Focus mode idle step 1 -> `08-focus-mode-idle.png`
  - Preset duration selection -> `09-focus-mode-preset-active.png`
  - Timer playing state -> `10-focus-mode-playing.png`
  - Timer paused state -> `11-focus-mode-paused.png`
  - Inputs entered -> `12-focus-mode-with-input.png`
- **Schedule Views (Click Depth 2 & 3)**:
  - Calendar grid -> `13-schedule-calendar.png`
  - Weekly order template editor -> `14-schedule-weekly-editor.png`, `15-schedule-weekly-editor-modified.png`
  - Reschedule audit trail history -> `16-schedule-history.png`
- **Workouts Sheets (Click Depth 2 & 3)**:
  - Workouts index -> `17-workouts-index.png`
  - Detailed sheet grid (empty and color-highlighted cells) -> `18-workout-grid-unfilled.png`, `19-workout-grid-filled.png`
- **Body & More Sub-menus**:
  - Body log table -> `20-body-log.png`
  - Settings base and estimator inputs -> `21-more-menu.png`, `22-settings-base.png`, `23-settings-ffmi-plan-filled.png`, `24-settings-ffmi-modal-open.png`
  - Calculators (Navy body-fat empty, 3-site Skinfold filled with inputs) -> `25-calculators-navy-empty.png`, `26-calculators-skinfold-filled.png`
  - Standalone timer -> `27-more-timer.png`
  - Quotes pack editor -> `28-more-quotes.png`
  - Personal notes -> `29-more-notes.png`
  - Cloud sync page -> `30-more-sync.png`
  - Abbreviations help -> `31-more-help.png`

### Determinism Controls

- **Pinned timezone**: `timezoneId: 'Europe/Madrid'` on all projects (playwright.config.ts) so tz-derived UI is reproducible on any host.
- **UTC-anchored frozen clock**: `page.clock.install({ time: new Date('2026-01-20T09:00:00Z') })` — the `Z` anchors the instant in UTC so it renders identically regardless of Node's local tz. The skip/swap deep link is derived from a named `PINNED_DAY` constant, not a bare magic string.
- **`fastForward`-driven timer states**: the frozen clock never advances on its own, so the playing/paused shots (`10`/`11`) call `page.clock.fastForward` (5 s, then 8 s) — the playback engine is `now`-driven (`src/lib/playback.ts`), so real elapsed time renders and the two shots differ in time, not just a button glyph.
- **LocalStorage Purging**: Purged `localStorage` at the start of the clean-state step to isolate execution from prior runs.
- **Layout Settle Buffers**: Used structured `page.waitForTimeout` buffers to allow transition animations and chart components to render fully.
- **Soft, full-page, stepped assertions**: every screenshot is `expect.soft(...).toHaveScreenshot(name, { fullPage: true })` inside a named `test.step`, so all 31 comparisons run and report (no first-diff masking) and content below the fold is verified. Functional gates (`toBeVisible`, clicks, fills) stay hard.

### Snapshot baseline strategy (per-platform)

Baselines are **per-platform**: the `snapshotPathTemplate` carries a `{platform}` token, so `…-win32.png` and `…-linux.png` sets are both committed and each OS compares only against snapshots rendered by its own font/rasterization stack (Windows Segoe UI vs. ubuntu Liberation/DejaVu). This lets the threshold be tight: config-level `maxDiffPixelRatio: 0.01` (1%), guarding minor anti-aliasing jitter only — no per-call slop. win32 baselines are generated on the dev machine (`npm run build && npx playwright test e2e/smoke.spec.ts --update-snapshots`); linux baselines were generated by a temporary CI `--update-snapshots` job, downloaded as an artifact, and committed. macOS contributors have no committed baselines and would generate `-darwin` locally.

---

## Adversarial re-review & hardening (2026-07-11)

The first pass shipped 31 screenshots but an adversarial re-review found the suite far
weaker than the requirement ("verify any UI issues visible in screens … across every
click depth and every state"). The findings and the fixes applied (all within 1.5.1, no
version bump):

- **F1 — Thresholds gutted.** Every assertion used `maxDiffPixelRatio: 0.15` (15% of pixels
  free to differ, atop the default per-pixel `threshold: 0.2`) — whole components could
  move undetected. The slop existed only to absorb Windows-vs-ubuntu font rendering on one
  shared, platform-agnostic baseline set. **Fix:** per-platform baselines (`-win32`/`-linux`)
  so each OS compares against its own stack, and a tight config-level `maxDiffPixelRatio: 0.01`.
- **F2 — Viewport-only capture.** `toHaveScreenshot()` defaults to the viewport, so everything
  below the fold of long screens was never verified. **Fix:** `fullPage: true` on all 31.
- **F3 — Silently skippable assertion.** Screenshot 26 was wrapped in
  `if (await chestInput.isVisible())`, so a regression that removed the input would pass with
  zero coverage; `name: /chest/i` also risked a strict-mode multi-match. **Fix:** unconditional,
  with a hard `toBeVisible` gate and exact accessible names (`Chest (mm)` etc.).
- **F4 — Illusory play/pause states.** The frozen clock never advanced, so "playing" and
  "paused" differed only by a button glyph. **Fix:** `clock.fastForward` (5 s, then 8 s) drives
  real elapsed time into the `now`-driven playback engine.
- **F5 — No pinned timezone.** `new Date('2026-01-20T09:00:00')` parsed in the host's local tz.
  **Fix:** UTC-anchored clock (`…T09:00:00Z`) + `timezoneId: 'Europe/Madrid'`.
- **F6 — Mega-test masked failures.** 31 hard assertions in one test meant the first diff threw
  and later shots never ran. **Fix:** `expect.soft` inside named `test.step`s — all comparisons
  run and report.
- **F7 — Docs lied.** This doc claimed `maxDiffPixelRatio: 0.05` (code said 0.15) and a blanket
  "PASS — full automated visual coverage." **Fix:** this section; the strategy above is now accurate.
- **F8 — Device-descriptor leftover.** `defaultBrowserType: 'chromium'` in the realme profile was
  redundant with `browserName`. **Fix:** removed.

### Status

SHIPPED as **1.5.1**. Coverage remains 31 screenshots × {desktop chromium, realme 16 Pro+ mobile},
now full-page and gated at a 1% per-platform threshold with deterministic timer states.

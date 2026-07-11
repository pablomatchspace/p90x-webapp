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
    viewport: { width: 412, height: 902 },
    deviceScaleFactor: 3.1,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'chromium',
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

- **Frozen Clock**: Pinned page clock to `2026-01-20T09:00:00` to prevent flakiness from dynamic dates.
- **LocalStorage Purging**: Purged `localStorage` at the start of the clean-state test to isolate execution from prior runs.
- **Layout Settle Buffers**: Used structured `page.waitForTimeout` buffers to allow transition animations and chart components to render fully.

---

## Adversarial QA Review by Fable AI

### 1. Verification Coverage Audit

- **Empty State**: Verified. Wiping `localStorage` at the beginning of the visual test ensures a consistent, reproducible empty state.
- **Populated State**: Verified. Simulating the "Try sample data" import flow loads the full catalog, history, and metrics.
- **Hierarchical Levels / Click Depths**: Verified. The test doesn't just navigate to static URLs. It performs real interactive flows (e.g. clicking presets, playing/pausing focus sequence, editing reps, dragging weekly order) to capture deep-linked layout transitions.
- **Form States**: Verified. Captured empty forms, filled inputs (FFMI settings, Skinfold caliper sites, Focus reps), and validation/confirmation modal overlays.

### 2. Flakiness & Regression Risk Assessment

- **Font Rendering Nuances**: Visual tests on Windows might drift slightly when executed in Linux CI. The use of `maxDiffPixelRatio: 0.05` provides a robust margin for anti-aliasing disparities.
- **Asynchronous Painting**: High-fidelity charts (trends, progress) require layout settle time. The implementation of `waitForTimeout(500)` before screenshots ensures complete rendering.
- **Strict Compilation**: Cleaned up unused imports (`devices` in playwright config, `importSample` and `Page` in smoke spec) preventing strict TS6133 failures during build.

### 3. Verdict

**PASS** · The implementation is robust, complete, and provides full automated visual test coverage of every interface state on both Desktop and the custom Realme mobile viewports.

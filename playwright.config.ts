import { defineConfig, devices } from '@playwright/test'

// E2E runs against the production build (`npm run build` first) so the
// service worker and base path behave exactly as on GitHub Pages.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173/p90x-webapp/',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/p90x-webapp/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})

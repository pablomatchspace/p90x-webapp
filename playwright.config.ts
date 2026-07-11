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
    {
      // Custom mobile device profile for realme 16 Pro+ (RMX5131)
      // Viewport width/height mapped to typical logical CSS pixels for this device class (412x902)
      // scaled from the hardware 1280x2800 display, matching its 19.5:9 aspect ratio.
      name: 'realme 16 Pro+',
      use: {
        browserName: 'chromium',
        viewport: { width: 412, height: 902 },
        deviceScaleFactor: 3.1,
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; RMX5131 Build/UKQ1.230924.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/p90x-webapp/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})

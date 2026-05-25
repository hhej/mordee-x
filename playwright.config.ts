import { defineConfig, devices } from '@playwright/test';

// Phase 6 cross-browser smoke + screenshot suite. Boots `pnpm dev` once and
// reuses it across runs. Two browser projects mirror the demo-day risk:
// chromium = presenter machine, webkit = the Safari/glass rendering check
// called out in plan §16.
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tests/e2e/test-results',
  // LangGraph triage/chat calls hit Gemini live, so give each test breathing
  // room. Single worker keeps the dev server's resources predictable.
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: './tests/e2e/playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'th-TH',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

import { test } from '@playwright/test';

// Static cross-browser sweep: load each route, give the radial-gradient
// background + glass surfaces a moment to settle, then snapshot to
// __screenshots__/<browser>-<route>.png for visual comparison.

const ROUTES = [
  { path: '/', name: 'landing' },
  { path: '/patient', name: 'patient' },
  { path: '/doctor', name: 'doctor' },
];

for (const route of ROUTES) {
  test(`screenshot ${route.name}`, async ({ page }, testInfo) => {
    await page.goto(route.path);
    await page.waitForLoadState('networkidle');
    // Glass blur + framer-motion intro animations
    await page.waitForTimeout(600);
    await page.screenshot({
      path: `tests/e2e/__screenshots__/${testInfo.project.name}-${route.name}.png`,
      fullPage: true,
    });
  });
}

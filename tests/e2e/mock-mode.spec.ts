import { expect, test } from '@playwright/test';

// C-03 layer 3: ?mock=1 swaps every /api/* route to canned responses from
// src/data/demo_scenarios.json. Provides a backup demo path if the on-stage
// network is rate-limited or Gemini misbehaves.

test('?mock=1 renders demo chip and serves canned triage + match', async ({ page }) => {
  // Spy every outbound /api/* request and assert each carries mock=1, so we
  // know no live Gemini calls are made.
  const apiRequests: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/')) apiRequests.push(url);
  });

  await page.goto('/patient?mock=1');

  // Demo-mode pill is visible.
  await expect(page.getByRole('status', { name: /Demo mode/ })).toBeVisible();

  // Fire the PD01 (yellow) scenario. mockTriage matches on the symptom text
  // keywords, so any "ปวดท้อง" string lands on yellow.
  await page.getByPlaceholder(/พิมพ์อาการ/).fill('ปวดท้องน้อย ท้องเสีย 2 วัน');
  await page.getByRole('button', { name: 'ส่ง' }).click();

  // Mock returns within ~50ms — far faster than any live call would. Use a
  // tight timeout to prove we're on the mock path.
  await expect(
    page.getByRole('heading', { name: /ควรปรึกษาแพทย์/ }),
  ).toBeVisible({ timeout: 2_000 });

  // Doctor match list also lands fast.
  await expect(page.getByRole('heading', { name: /เลือกแพทย์/ })).toBeVisible({ timeout: 3_000 });

  // Every captured /api/* call must carry mock=1.
  expect(apiRequests.length).toBeGreaterThan(0);
  for (const url of apiRequests) {
    expect(url).toContain('mock=1');
  }
});

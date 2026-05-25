import { expect, test } from '@playwright/test';

// C-03 layer 1: when a /api/* call exceeds the client-side timeout
// (AbortSignal.timeout in src/lib/fetch-abort.ts), the friendly Thai message
// "AI ตอบช้าผิดปกติ — ลองอีกครั้ง" must appear in the error banner instead of
// a HTTP status code or generic error string.

// JSON_TIMEOUT_MS in src/lib/fetch-abort.ts is 20s. Stall the route past it.
test('triage timeout surfaces friendly Thai message', async ({ page }) => {
  test.setTimeout(60_000);

  await page.route('**/api/triage', async (route) => {
    // Stall well past JSON_TIMEOUT_MS (20s) so the AbortSignal.timeout fires.
    await new Promise((r) => setTimeout(r, 25_000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ triage: 'green', specialty_hint: 'GP', urgency_reason_th: 'ok' }),
    });
  });

  await page.goto('/patient');
  await page.getByPlaceholder(/พิมพ์อาการ/).fill('ปวดหัวเล็กน้อย');
  await page.getByRole('button', { name: 'ส่ง' }).click();

  await expect(page.getByText('AI ตอบช้าผิดปกติ — ลองอีกครั้ง')).toBeVisible({
    timeout: 30_000,
  });
});

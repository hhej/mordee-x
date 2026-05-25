import { expect, test } from '@playwright/test';

// H-04: closing the consult mid-stream must abort the in-flight /api/chat
// request so it stops appending tokens and stops burning Gemini quota.
//
// We run under ?mock=1 so the chat stream is the deterministic 15-chunk
// drip from src/lib/mocks.ts (~1.2s end-to-end). That gives us a stable
// window to click the close X while the stream is still open.

test('doctor close X mid-stream cancels the /api/chat request', async ({ page }) => {
  let chatCancelled = false;
  page.on('requestfailed', (req) => {
    if (req.url().includes('/api/chat')) chatCancelled = true;
  });

  await page.goto('/doctor?mock=1');

  // Open the first appointment row (A001 at 10:00 — นางสาว มะลิ).
  await page.getByRole('button', { name: /^เปิด/ }).first().click();

  // Wait for ConsultPanel header to appear.
  await expect(page.getByRole('heading', { name: 'ห้องปรึกษา' })).toBeVisible();

  // Send a chat message to trigger /api/chat?mock=1.
  await page.getByPlaceholder(/พิมพ์ข้อความ/).fill('สวัสดีค่ะ');
  await page.getByRole('button', { name: 'ส่ง' }).click();

  // The streaming-cursor glyph "▍" only shows while /api/chat is open.
  await expect(page.getByText('▍')).toBeVisible({ timeout: 3_000 });

  // Close X — aria-label="ปิด" on the icon button. exact:true so we don't
  // also match the "เปิด" buttons on the appointment rows (substring match).
  await page.getByRole('button', { name: 'ปิด', exact: true }).click();

  // The active /api/chat must be aborted at the network layer.
  await expect.poll(() => chatCancelled, { timeout: 5_000 }).toBe(true);

  // No error banner should surface from the abort.
  await expect(page.getByText(/HTTP \d+/)).toHaveCount(0);
});

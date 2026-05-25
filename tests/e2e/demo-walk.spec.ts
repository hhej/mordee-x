import { expect, test } from '@playwright/test';

// Main §13 demo path: PD01 (yellow gastroenteritis) → match → book → pay →
// consult → summary. Runs live against Gemini, so allow generous timeouts.
//
// Screenshots are captured at each beat into __screenshots__/walk-<browser>-NN.png
// so a regression in any single step is visible without re-running the suite.

test('full patient demo walk', async ({ page }, testInfo) => {
  const shot = (i: number, name: string) =>
    page.screenshot({
      path: `tests/e2e/__screenshots__/walk-${testInfo.project.name}-${String(i).padStart(2, '0')}-${name}.png`,
      fullPage: true,
    });

  // 1. Land on /
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ฉันเป็นผู้ป่วย' })).toBeVisible();
  await shot(1, 'landing');

  // 2. Enter patient flow
  await page.getByRole('link', { name: /ผู้ป่วย/ }).click();
  await expect(page.getByRole('heading', { name: /อาการของคุณเป็นอย่างไร/ })).toBeVisible();

  // 3. Click PD01 chip (🤢 ปวดท้อง ท้องเสีย) — preloads the yellow scenario
  await page.getByRole('button', { name: /ปวดท้อง ท้องเสีย/ }).click();
  await page.getByRole('button', { name: 'ส่ง' }).click();

  // 4. Wait for triage result — YELLOW. Scope to the heading; the LLM's
  // reasoning paragraph sometimes echoes the same Thai phrase.
  await expect(page.getByRole('heading', { name: /ควรปรึกษาแพทย์/ })).toBeVisible({ timeout: 45_000 });
  await shot(2, 'triage-yellow');

  // 5. Wait for doctor match list, click first จอง (Book)
  await expect(page.getByRole('heading', { name: /เลือกแพทย์/ })).toBeVisible({ timeout: 45_000 });
  // Wait until skeletons resolve into real cards
  await expect(page.getByRole('button', { name: /จอง$/ }).first()).toBeVisible({ timeout: 30_000 });
  await shot(3, 'match');
  await page.getByRole('button', { name: /จอง$/ }).first().click();

  // 6. BookingDialog: ปรึกษาตอนนี้ tab is default, confirm
  await expect(page.getByText(/หมอพร้อมให้บริการใน/)).toBeVisible();
  await page.getByRole('button', { name: /ยืนยัน จ่ายเงิน/ }).click();

  // 7. MockPaymentDialog: pay
  await expect(page.getByRole('button', { name: /พร้อมเพย์/ })).toBeVisible();
  await shot(4, 'payment');
  await page.getByRole('button', { name: /พร้อมเพย์/ }).click();

  // 8. Payment success affirmation flashes briefly
  await expect(page.getByText('ชำระเงินสำเร็จ')).toBeVisible({ timeout: 10_000 });
  await shot(5, 'payment-success');

  // 9. Consult panel appears, doctor's reply streams in
  await expect(page.getByRole('heading', { name: /ห้องปรึกษา/ })).toBeVisible({ timeout: 15_000 });
  // H-02 guard counts user-authored messages only (kickoff seeds 1 user msg;
  // need >=2 user messages to enable End consult). Send a real follow-up
  // reply after the doctor's first response lands.
  await expect(page.getByPlaceholder(/พิมพ์ข้อความถึงคุณหมอ/)).toBeEnabled({ timeout: 60_000 });
  await page.getByPlaceholder(/พิมพ์ข้อความถึงคุณหมอ/).fill('ขอบคุณค่ะคุณหมอ');
  // Two "ส่ง" buttons exist (SymptomChat at top + ChatStream in the consult
  // panel). Scope to the chat input's row.
  await page
    .getByPlaceholder(/พิมพ์ข้อความถึงคุณหมอ/)
    .locator('..')
    .getByRole('button', { name: 'ส่ง' })
    .click();
  // Wait for the second doctor reply to finish — End consult must now enable.
  await expect(page.getByRole('button', { name: /จบการปรึกษา/ })).toBeEnabled({ timeout: 60_000 });
  await shot(6, 'consult');

  // 10. End consult, wait for summary card
  await page.getByRole('button', { name: /จบการปรึกษา/ }).click();
  await expect(page.getByRole('heading', { name: /สรุปการปรึกษา/ })).toBeVisible({ timeout: 60_000 });
  // Wait for tabs to render (i.e. summary loaded, not just the spinner)
  await expect(page.getByRole('tab', { name: /ใบรับรองแพทย์/ })).toBeVisible({ timeout: 60_000 });
  await shot(7, 'summary-cert');

  // 11. Switch to self-care tab
  await page.getByRole('tab', { name: /แผนดูแลตัวเอง/ }).click();
  await shot(8, 'summary-care');
});

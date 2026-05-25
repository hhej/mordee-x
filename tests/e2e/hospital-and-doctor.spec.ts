import { expect, test } from '@playwright/test';

// Extra coverage for the UX critique screenshot pass:
// (a) red-triage → hospital screen with the new M-01 exit affordance
// (b) doctor dashboard full view

test('red triage lands on hospital screen', async ({ page }, testInfo) => {
  const shot = (i: number, name: string) =>
    page.screenshot({
      path: `tests/e2e/__screenshots__/hosp-${testInfo.project.name}-${String(i).padStart(2, '0')}-${name}.png`,
      fullPage: true,
    });

  await page.goto('/patient');
  await expect(page.getByRole('heading', { name: /อาการของคุณเป็นอย่างไร/ })).toBeVisible();

  // PD02 = red scenario (chest pain). Click the chip then submit.
  await page.getByRole('button', { name: /เจ็บหน้าอก|หายใจไม่ออก|chest/i }).click();
  await page.getByRole('button', { name: 'ส่ง' }).click();

  await expect(
    page.getByRole('heading', { name: 'กรณีฉุกเฉิน · ไปโรงพยาบาลทันที' }),
  ).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(400);
  await shot(1, 'hospital-list');
});

test('doctor dashboard full view', async ({ page }, testInfo) => {
  const shot = (name: string) =>
    page.screenshot({
      path: `tests/e2e/__screenshots__/doc-${testInfo.project.name}-${name}.png`,
      fullPage: true,
    });

  await page.goto('/doctor');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await shot('dashboard');
});

import { expect, test } from '@playwright/test';

// §13 backup demos: red triage (PD02, chest pain → ER + hospital list) and
// green triage (PD03, mild headache → self-care + doctor list). Used as
// smoke before recording Loom so we know both branches still render.

test('red triage shows hospital list + 1669', async ({ page }, testInfo) => {
  await page.goto('/patient');
  await page.getByRole('button', { name: /เจ็บหน้าอก/ }).click();
  await page.getByRole('button', { name: 'ส่ง' }).click();

  await expect(page.getByRole('heading', { name: /อาการฉุกเฉิน/ })).toBeVisible({ timeout: 45_000 });
  // HospitalListCard renders the 1669 emergency hotline as a tel: link
  await expect(page.getByRole('link', { name: /โทร 1669/ })).toBeVisible();
  // At least one hospital row with the new address polish
  await expect(page.getByText('โรงพยาบาลรามาธิบดี')).toBeVisible();

  await page.screenshot({
    path: `tests/e2e/__screenshots__/backup-${testInfo.project.name}-red.png`,
    fullPage: true,
  });
});

test('green triage shows self-care direction + doctor list', async ({ page }, testInfo) => {
  await page.goto('/patient');
  await page.getByRole('button', { name: /ปวดหัว เครียด/ }).click();
  await page.getByRole('button', { name: 'ส่ง' }).click();

  await expect(page.getByRole('heading', { name: /ดูแลตัวเองได้/ })).toBeVisible({ timeout: 45_000 });
  // Green path still surfaces the matched doctor list (patient may upgrade)
  await expect(page.getByRole('heading', { name: /เลือกแพทย์/ })).toBeVisible({ timeout: 45_000 });

  await page.screenshot({
    path: `tests/e2e/__screenshots__/backup-${testInfo.project.name}-green.png`,
    fullPage: true,
  });
});

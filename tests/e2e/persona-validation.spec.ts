import { expect, test } from '@playwright/test';

// H-05 / H-06: persona popover must refuse to save blank name or age outside [1, 120].
// Pre-fix: empty name silently wrote, age "abc" coerced to 0, header chip showed
// `· 0 · ช` and the LLM prompt got a 0-year-old patient.

test.describe('persona popover validation', () => {
  test('Save disabled when name is empty', async ({ page }) => {
    await page.goto('/patient');

    // Open persona popover via the chip in the page header.
    await page.getByTitle('แก้ไขข้อมูลผู้ป่วย').click();

    const nameInput = page.getByLabel(/ชื่อ/);
    const saveBtn = page.getByRole('button', { name: 'บันทึก' });

    await expect(saveBtn).toBeEnabled();

    await nameInput.fill('');
    await expect(saveBtn).toBeDisabled();
    await expect(page.getByText('กรุณากรอกชื่อ · Name required')).toBeVisible();

    await nameInput.fill('Pol');
    await expect(saveBtn).toBeEnabled();
  });

  test('Save disabled when age is empty or out of range', async ({ page }) => {
    await page.goto('/patient');
    await page.getByTitle('แก้ไขข้อมูลผู้ป่วย').click();

    const ageInput = page.getByLabel(/อายุ/);
    const saveBtn = page.getByRole('button', { name: 'บันทึก' });

    // Empty age
    await ageInput.fill('');
    await expect(saveBtn).toBeDisabled();
    await expect(page.getByText('อายุต้องอยู่ระหว่าง 1–120 · Age 1–120')).toBeVisible();

    // Above range
    await ageInput.fill('999');
    await expect(saveBtn).toBeDisabled();

    // Zero
    await ageInput.fill('0');
    await expect(saveBtn).toBeDisabled();

    // Valid
    await ageInput.fill('35');
    await expect(saveBtn).toBeEnabled();
  });

  test('saving valid edits closes popover and updates header chip', async ({ page }) => {
    await page.goto('/patient');
    await page.getByTitle('แก้ไขข้อมูลผู้ป่วย').click();

    await page.getByLabel(/ชื่อ/).fill('คุณตัวอย่าง');
    await page.getByLabel(/อายุ/).fill('42');
    await page.getByRole('button', { name: 'บันทึก' }).click();

    // Popover closes — Save button no longer in the DOM
    await expect(page.getByRole('button', { name: 'บันทึก' })).toHaveCount(0);

    // Chip reflects the new persona
    const chip = page.getByTitle('แก้ไขข้อมูลผู้ป่วย');
    await expect(chip).toContainText('คุณตัวอย่าง');
    await expect(chip).toContainText('42');
  });
});

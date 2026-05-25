import { expect, test } from '@playwright/test';

// C-03 layer 2: branded 404 + error pages so an unknown route or a thrown
// server error doesn't drop the user out of the MorDee+ brand into Next's
// default English fallback.

test('unknown route renders branded Thai 404', async ({ page }) => {
  const res = await page.goto('/this-route-does-not-exist');
  expect(res?.status()).toBe(404);

  await expect(page.getByText('MorDee+', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ไม่พบหน้าที่คุณต้องการ' })).toBeVisible();
  await expect(page.getByRole('link', { name: /กลับหน้าหลัก/ })).toHaveAttribute('href', '/');
});

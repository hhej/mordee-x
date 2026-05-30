// Drive the live deployment at https://mordee-x.vercel.app/ and capture the
// 5 PNGs that the README references. Run with:
//   node scripts/capture-readme-screenshots.mjs
//
// Hits Gemini for real (triage + consult), so allow generous timeouts.

import { chromium, devices } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const BASE = process.env.SCREENSHOT_BASE_URL || 'https://mordee-x.vercel.app';
const OUT_DIR = resolve('docs/screenshots');

const shot = (page, name) =>
  page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: true });

const settle = (page, ms = 800) => page.waitForTimeout(ms);

async function captureLanding(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'ฉันเป็นผู้ป่วย' }).waitFor();
  await settle(page);
  await shot(page, 'landing');
  await page.close();
  console.log('✓ landing.png');
}

async function captureDoctor(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/doctor`, { waitUntil: 'networkidle' });
  // DoctorPersonaPicker — first card. aria-label = "เข้าใช้งานในชื่อ <name>"
  await page
    .getByRole('button', { name: /เข้าใช้งานในชื่อ/ })
    .first()
    .click({ timeout: 15_000 });
  // Wait for the dashboard's heatmap + queue cards to settle in
  await page.waitForLoadState('networkidle');
  await settle(page, 2000);
  await shot(page, 'doctor-dashboard');
  await page.close();
  console.log('✓ doctor-dashboard.png');
}

async function selectFirstPatientPersona(page) {
  // PatientPersonaPicker — first card. aria-label = "เลือกบทบาท <name>"
  const picker = page.getByRole('button', { name: /เลือกบทบาท/ }).first();
  if (await picker.isVisible().catch(() => false)) {
    await picker.click();
  }
}

async function captureYellowMatchAndConsult(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/patient`, { waitUntil: 'networkidle' });
  await selectFirstPatientPersona(page);

  // PD01 chip → submit
  await page
    .getByRole('button', { name: /ปวดท้อง ท้องเสีย/ })
    .click({ timeout: 15_000 });
  await page.getByRole('button', { name: 'ส่ง' }).click();

  // Triage YELLOW panel
  await page
    .getByRole('heading', { name: /ควรปรึกษาแพทย์/ })
    .waitFor({ timeout: 60_000 });

  // Match list resolves
  await page
    .getByRole('heading', { name: /เลือกแพทย์/ })
    .waitFor({ timeout: 60_000 });
  await page
    .getByRole('button', { name: /จอง$/ })
    .first()
    .waitFor({ timeout: 45_000 });
  await settle(page, 600);
  await shot(page, 'patient-match');
  console.log('✓ patient-match.png');

  // Book → pay → consult
  await page.getByRole('button', { name: /จอง$/ }).first().click();
  await page.getByText(/หมอพร้อมให้บริการใน/).waitFor();
  await page.getByRole('button', { name: /ยืนยัน จ่ายเงิน/ }).click();
  await page.getByRole('button', { name: /พร้อมเพย์/ }).waitFor();
  await page.getByRole('button', { name: /พร้อมเพย์/ }).click();

  // Consult panel + first doctor reply streams in
  await page
    .getByRole('heading', { name: /ห้องปรึกษา/ })
    .waitFor({ timeout: 20_000 });
  await page
    .getByPlaceholder(/พิมพ์ข้อความถึงคุณหมอ/)
    .waitFor({ state: 'visible', timeout: 60_000 });
  // Wait until the chat input is enabled — that's the signal the first
  // doctor reply has finished streaming.
  await page
    .getByPlaceholder(/พิมพ์ข้อความถึงคุณหมอ/)
    .waitFor({ state: 'attached' });
  await page.waitForFunction(
    () => {
      const el = document.querySelector(
        'textarea[placeholder*="พิมพ์ข้อความถึงคุณหมอ"], input[placeholder*="พิมพ์ข้อความถึงคุณหมอ"]'
      );
      return el && !el.disabled;
    },
    null,
    { timeout: 90_000 }
  );
  await settle(page, 1200);
  await shot(page, 'patient-consult');
  console.log('✓ patient-consult.png');

  await page.close();
}

async function captureEmergency(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/patient`, { waitUntil: 'networkidle' });
  await selectFirstPatientPersona(page);
  await page
    .getByRole('button', { name: /เจ็บหน้าอก/ })
    .click({ timeout: 15_000 });
  await page.getByRole('button', { name: 'ส่ง' }).click();

  await page
    .getByRole('heading', { name: /กรณีฉุกเฉิน/ })
    .waitFor({ timeout: 90_000 });
  await page.getByRole('link', { name: /โทร 1669/ }).waitFor();
  await page.getByText('โรงพยาบาลรามาธิบดี').waitFor({ timeout: 30_000 });
  await settle(page, 800);
  await shot(page, 'emergency-path');
  await page.close();
  console.log('✓ emergency-path.png');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...devices['Desktop Chrome'],
    locale: 'th-TH',
  });

  try {
    // Static routes first (cheap), then LLM-driven flows.
    await captureLanding(ctx);
    await captureDoctor(ctx);
    await captureEmergency(ctx);
    await captureYellowMatchAndConsult(ctx);
  } finally {
    await ctx.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

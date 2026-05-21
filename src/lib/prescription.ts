import type { SummaryResult } from '@/lib/llm/schemas';

// Build a natural Thai sentence the doctor (presenter) can paste into the
// chat. Combines the prebaked meds with a follow-up reminder; for cases
// where the doctor sent for labs instead of prescribing, falls back to a
// lifestyle-advice sentence so the demo still has something to click.
export function buildPrescriptionThai(summary: SummaryResult): string {
  const meds = summary.self_care_plan.medications;

  if (meds.length === 0) {
    const advice = summary.self_care_plan.summary_th.trim();
    const rest = summary.self_care_plan.rest_advice_th.trim();
    const followup = summary.needs_followup
      ? ` ขอนัดติดตามผลใน ${summary.followup_in_days} วันนะครับ`
      : '';
    return `${advice} ${rest}${followup}`.trim();
  }

  const medParts = meds.map((m) => {
    const withFood = m.with_food ? ' (รับประทานพร้อมอาหาร)' : '';
    return `${m.name_th} ${m.dose_th} ${m.frequency_th} ${m.duration_th}${withFood}`;
  });

  const medList =
    medParts.length === 1
      ? medParts[0]
      : `${medParts.slice(0, -1).join(', ')} และ ${medParts[medParts.length - 1]}`;

  const followup = summary.needs_followup
    ? ` ถ้าไม่ดีขึ้นใน ${summary.followup_in_days ?? 7} วัน กลับมาพบหมอนะครับ`
    : '';

  return `ผมจะให้ ${medList} ครับ${followup}`;
}

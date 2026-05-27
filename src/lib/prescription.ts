import type { SummaryResult, PrescribeResult } from '@/lib/llm/schemas';

// The fields buildPrescriptionThai actually needs. Both the cached SummaryResult
// (D001) and the live PrescribeResult (everyone else) flatten into this shape.
export interface PrescriptionParts {
  medications: SummaryResult['self_care_plan']['medications'];
  /** Self-care/referral advice used when there are no meds. */
  summary_th: string;
  rest_advice_th: string;
  needs_followup: boolean;
  followup_in_days: number | null;
}

/** Adapt a full consult summary (D001's pre-baked cache) into PrescriptionParts. */
export function partsFromSummary(s: SummaryResult): PrescriptionParts {
  return {
    medications: s.self_care_plan.medications,
    summary_th: s.self_care_plan.summary_th,
    rest_advice_th: s.self_care_plan.rest_advice_th,
    needs_followup: s.needs_followup,
    followup_in_days: s.followup_in_days,
  };
}

/** Adapt a live prescription suggestion into PrescriptionParts (it already matches). */
export function partsFromPrescribe(p: PrescribeResult): PrescriptionParts {
  return {
    medications: p.medications,
    summary_th: p.summary_th,
    rest_advice_th: p.rest_advice_th,
    needs_followup: p.needs_followup,
    followup_in_days: p.followup_in_days,
  };
}

// Build a natural Thai sentence the doctor can paste into the chat. Combines
// the meds with a follow-up reminder; for cases where the doctor sent for labs
// or referred instead of prescribing, falls back to a care-advice sentence so
// the chip still produces something useful to click.
export function buildPrescriptionThai(parts: PrescriptionParts): string {
  const { medications: meds } = parts;
  const followupDays = parts.followup_in_days ?? 7;

  if (meds.length === 0) {
    const advice = parts.summary_th.trim();
    const rest = parts.rest_advice_th.trim();
    const followup = parts.needs_followup ? ` ขอนัดติดตามผลใน ${followupDays} วันนะครับ` : '';
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

  const followup = parts.needs_followup
    ? ` ถ้าไม่ดีขึ้นใน ${followupDays} วัน กลับมาพบหมอนะครับ`
    : '';

  return `ผมจะให้ ${medList} ครับ${followup}`;
}

// Local Rx fallback. Powers the doctor-side "ร่างคำสั่งยา" chip when the live
// /api/prescribe call can't run — i.e. the ?mock=1 stage demo, a Gemini
// timeout, or no API key. Pure + client/server-safe (JSON imported as a TS
// module like src/lib/data.ts — never fs), so both the store (client) and the
// API route's mock path (server) can call it.

import rxData from '@/data/rx_suggestions.json';
import type { PrescribeResult } from '@/lib/llm/schemas';

type Triage = 'green' | 'yellow' | 'red';

const KB = rxData as {
  by_specialty: Record<string, PrescribeResult>;
  keyword_overrides: Record<string, PrescribeResult>;
  red_triage: PrescribeResult;
  default: PrescribeResult;
};

// Checked before specialty so a vaccination/allergy/result-review visit gets a
// clinically-sensible suggestion regardless of the doctor's specialty.
const KEYWORD_RULES: Array<{ re: RegExp; key: string }> = [
  { re: /วัคซีน|ฉีดวัคซีน|ฉีดเข็ม/i, key: 'vaccination' },
  { re: /ผื่น|ลมพิษ|คัน|แพ้|กุ้ง|อาหารทะเล/i, key: 'antihistamine' },
  { re: /ผล.*ตรวจ|EKG|ekg|ไขมัน|คอเลสเตอรอล|ความดัน|เบาหวาน|ปรับยา|ทบทวนยา/i, key: 'review' },
];

/**
 * Deterministic Rx suggestion. Resolution order:
 *   1. red triage  → referral, no meds
 *   2. symptom keyword override (vaccination / allergy / results review)
 *   3. specialty entry
 *   4. global default
 */
export function suggestRxLocal(
  specialty: string | undefined,
  symptom: string,
  triage: Triage,
): PrescribeResult {
  if (triage === 'red') return KB.red_triage;

  for (const { re, key } of KEYWORD_RULES) {
    if (re.test(symptom) && KB.keyword_overrides[key]) {
      return KB.keyword_overrides[key];
    }
  }

  if (specialty && KB.by_specialty[specialty]) {
    return KB.by_specialty[specialty];
  }

  return KB.default;
}

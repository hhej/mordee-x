// Thai-friendly labels + direction hints for the no-show model's top SHAP features.
// Positive SHAP = pushes prediction toward no-show. Negative SHAP = pushes toward show.

const LABELS: Record<string, { th: string; describe: (value: number) => string }> = {
  lead_time_hours: {
    th: 'จองล่วงหน้า',
    describe: (v) => `${Math.round(v)} ชม.`,
  },
  sms_confirmed: {
    th: 'ยืนยัน SMS',
    describe: (v) => (v >= 1 ? 'ยืนยันแล้ว' : 'ยังไม่ยืนยัน'),
  },
  paid_upfront: {
    th: 'ชำระล่วงหน้า',
    describe: (v) => (v >= 1 ? 'ชำระแล้ว' : 'ยังไม่ชำระ'),
  },
  prior_completion_rate: {
    th: 'อัตรามาตามนัดเดิม',
    describe: (v) => `${Math.round(v * 100)}%`,
  },
  age: {
    th: 'อายุ',
    describe: (v) => `${Math.round(v)} ปี`,
  },
  symptom_category_uti: {
    th: 'กลุ่มอาการ UTI',
    describe: (v) => (v >= 1 ? 'ใช่' : 'ไม่ใช่'),
  },
};

export interface TranslatedFactor {
  th: string;
  value_th: string;
  direction: 'up' | 'down';
  weight: number;
}

export function translateFactor(feature: string, value: number, shap: number): TranslatedFactor {
  const entry = LABELS[feature];
  const direction: 'up' | 'down' = shap >= 0 ? 'up' : 'down';
  if (!entry) {
    return { th: feature, value_th: String(value), direction, weight: Math.abs(shap) };
  }
  return {
    th: entry.th,
    value_th: entry.describe(value),
    direction,
    weight: Math.abs(shap),
  };
}

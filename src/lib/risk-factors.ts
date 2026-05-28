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
  prior_no_show_count: {
    th: 'เคยไม่มาตามนัด',
    describe: (v) => `${Math.round(v)} ครั้ง`,
  },
  prior_bookings_count: {
    th: 'จำนวนนัดที่ผ่านมา',
    describe: (v) => `${Math.round(v)} ครั้ง`,
  },
  app_opens_pre_visit: {
    th: 'เปิดแอปก่อนนัด',
    describe: (v) => `${Math.round(v)} ครั้ง`,
  },
  engagement_score: {
    th: 'คะแนนการมีส่วนร่วม',
    describe: (v) => `${Math.round(v)}/4`,
  },
  reminder_clicked: {
    th: 'กดเปิดการแจ้งเตือน',
    describe: (v) => (v >= 1 ? 'กดแล้ว' : 'ไม่ได้กด'),
  },
  push_enabled: {
    th: 'เปิดแจ้งเตือน',
    describe: (v) => (v >= 1 ? 'เปิด' : 'ปิด'),
  },
  is_new_user: {
    th: 'ผู้ใช้ใหม่',
    describe: (v) => (v >= 1 ? 'ใช่' : 'ไม่ใช่'),
  },
  is_weekend: {
    th: 'นัดวันหยุดสุดสัปดาห์',
    describe: (v) => (v >= 1 ? 'ใช่' : 'ไม่ใช่'),
  },
  triage_color_red: {
    th: 'อาการระดับฉุกเฉิน (แดง)',
    describe: (v) => (v >= 1 ? 'ใช่' : 'ไม่ใช่'),
  },
  triage_color_yellow: {
    th: 'อาการระดับเฝ้าระวัง (เหลือง)',
    describe: (v) => (v >= 1 ? 'ใช่' : 'ไม่ใช่'),
  },
  triage_color_green: {
    th: 'อาการไม่เร่งด่วน (เขียว)',
    describe: (v) => (v >= 1 ? 'ใช่' : 'ไม่ใช่'),
  },
};

// Thai names for the one-hot symptom-category features (symptom_category_<key>).
const SYMPTOM_TH: Record<string, string> = {
  cough: 'ไอ',
  joint_pain: 'ปวดข้อ',
  general: 'อาการทั่วไป',
  headache: 'ปวดศีรษะ',
  diarrhea: 'ท้องเสีย',
  sore_throat: 'เจ็บคอ',
  palpitations: 'ใจสั่น',
  chest_pain: 'เจ็บหน้าอก',
  chronic_followup: 'ติดตามอาการเรื้อรัง',
  pediatric_fever: 'ไข้ในเด็ก',
  pediatric_rash: 'ผื่นในเด็ก',
  pediatric_gi: 'อาการทางเดินอาหารในเด็ก',
  preventive_care: 'ดูแลเชิงป้องกัน',
  dyspnea: 'หายใจลำบาก',
  asthma: 'หอบหืด',
  uti: 'UTI',
};

export interface TranslatedFactor {
  th: string;
  value_th: string;
  direction: 'up' | 'down';
  weight: number;
}

export function translateFactor(feature: string, value: number, shap: number): TranslatedFactor {
  const direction: 'up' | 'down' = shap >= 0 ? 'up' : 'down';
  if (feature.startsWith('symptom_category_')) {
    const key = feature.slice('symptom_category_'.length);
    return {
      th: `กลุ่มอาการ: ${SYMPTOM_TH[key] ?? key}`,
      value_th: value >= 1 ? 'ใช่' : 'ไม่ใช่',
      direction,
      weight: Math.abs(shap),
    };
  }
  const entry = LABELS[feature];
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

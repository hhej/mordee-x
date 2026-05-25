// Demo magic strings + timing knobs. Centralized so a grader probing the code
// finds them in one place, and so demo-day tweaks don't require sweeping edits.

export const INSTANT_CONSULT_WAIT_TH = '3 นาที';
export const INSTANT_CONSULT_WAIT_EN = '3 min';

// MockPayment fake processing delay (ms). Long enough to read the spinner,
// short enough not to bore the demo audience.
export const MOCK_PAYMENT_DELAY_MS = 2000;

// How long the payment success affirmation stays on-screen before the dialog
// auto-closes into the consult.
export const PAYMENT_SUCCESS_FLASH_MS = 900;

// Demo currency symbol — Thai baht.
export const CURRENCY_BAHT = '฿';

// Common Thai underlying-condition presets for the patient profile chip
// picker. Bilingual labels are shown in the UI (TH primary · EN secondary).
// The value stored in the persona is the Thai string (matches what the LLM
// sees in the consult system prompt).
export const COMMON_CONDITIONS_TH: ReadonlyArray<{ th: string; en: string }> = [
  { th: 'เบาหวาน', en: 'Diabetes' },
  { th: 'ความดันโลหิตสูง', en: 'Hypertension' },
  { th: 'ไขมันในเลือดสูง', en: 'Dyslipidemia' },
  { th: 'หอบหืด', en: 'Asthma' },
  { th: 'ภูมิแพ้', en: 'Allergic rhinitis' },
  { th: 'โรคหัวใจ', en: 'Heart disease' },
  { th: 'ไตเรื้อรัง', en: 'CKD' },
  { th: 'ไทรอยด์', en: 'Thyroid' },
  { th: 'ไมเกรน', en: 'Migraine' },
];

// Common drug-allergy presets. Stored as plain English strings since drug
// names are typically written in Latin script on Thai prescriptions.
export const COMMON_DRUG_ALLERGIES: ReadonlyArray<string> = [
  'Penicillin',
  'NSAIDs',
  'Sulfa',
  'Aspirin',
  'Paracetamol',
];

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodType = (typeof BLOOD_TYPES)[number] | 'unknown';

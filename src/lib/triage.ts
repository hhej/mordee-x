export type TriageTier = 'green' | 'yellow' | 'red';

/** Pill classes for a triage tier — mint/triage palette tokens (globals.css). */
export const TRIAGE_CHIP: Record<TriageTier, string> = {
  green: 'bg-triage-green/10 text-triage-green ring-triage-green/30',
  yellow: 'bg-triage-yellow/10 text-triage-yellow ring-triage-yellow/30',
  red: 'bg-triage-red/10 text-triage-red ring-triage-red/30',
};

/** Thai label for a triage tier, used on doctor-facing chips. */
export const TRIAGE_LABEL_TH: Record<TriageTier, string> = {
  green: 'เขียว · ดูแลตัวเอง',
  yellow: 'เหลือง · ควรปรึกษาแพทย์',
  red: 'แดง · เร่งด่วน',
};

// Belt-and-suspenders RED triage safety net.
// Mirrors the HARD RULES in prompts.ts SYSTEM_TRIAGE §1.
// Used by /api/triage as a pre-LLM gate (short-circuit) AND post-LLM validator.

interface RedRule {
  name: string;
  pattern: RegExp;
}

const RED_RULES: RedRule[] = [
  {
    name: 'chest_pain',
    pattern: /เจ็บหน้าอก|แน่นหน้าอก|chest pain|chest pressure|chest tightness/i,
  },
  {
    name: 'stroke_fast',
    pattern: /ปากเบี้ยว|แขนอ่อนแรง|พูดไม่ชัด|ตามองไม่เห็นเฉียบพลัน|stroke|face drooping|arm weakness|slurred speech|sudden vision loss/i,
  },
  {
    name: 'severe_dyspnea',
    pattern: /หายใจไม่ออก|หายใจไม่ทัน|สำลักหายใจ|severe (shortness of breath|dyspnea|difficulty breathing)/i,
  },
  {
    name: 'loss_of_consciousness',
    pattern: /หมดสติ|เป็นลม|สลบ|loss of consciousness|fainted?|passed out|syncope/i,
  },
  {
    name: 'sudden_severe_headache',
    pattern: /ปวดหัวรุนแรง(?:ที่สุด)?|ปวดหัวเฉียบพลัน|thunderclap headache|worst headache(?: of (?:my|his|her) life)?/i,
  },
  {
    name: 'bloody_gi',
    pattern: /อาเจียนเป็นเลือด|อุจจาระเป็นเลือด|ถ่ายเป็นเลือด|vomit(?:ing)? blood|hematemesis|bloody stool|melena|hematochezia/i,
  },
  {
    name: 'high_fever_meningismus',
    pattern: /ไข้สูง.*?คอแข็ง|ไข้สูง.*?สับสน|high fever.*?(neck stiffness|nuchal rigidity|confusion)/i,
  },
  {
    name: 'anaphylaxis',
    pattern: /แพ้รุนแรง|ปากบวม|คอบวม|ลิ้นบวม|anaphylaxis|throat swelling|tongue swelling|facial swelling/i,
  },
  {
    name: 'severe_bleeding',
    pattern: /เลือดออก(?:เยอะ|ไม่หยุด|มาก)|severe bleeding|hemorrhage|won'?t stop bleeding/i,
  },
  {
    name: 'suicidal',
    pattern: /อยากตาย|ฆ่าตัวตาย|ทำร้ายตัวเอง|suicidal|suicide|self[- ]harm|kill myself/i,
  },
];

export interface RedMatch {
  rule: string;
  matched: string;
}

export function detectRedKeywords(text: string): RedMatch[] {
  const matches: RedMatch[] = [];
  for (const rule of RED_RULES) {
    const m = text.match(rule.pattern);
    if (m) matches.push({ rule: rule.name, matched: m[0] });
  }
  return matches;
}

export function redKeywordGate(text: string): boolean {
  return detectRedKeywords(text).length > 0;
}

export type TriageColor = 'green' | 'yellow' | 'red';

export function redKeywordValidator(text: string, llmTriage: TriageColor): TriageColor {
  if (llmTriage === 'red') return 'red';
  return detectRedKeywords(text).length > 0 ? 'red' : llmTriage;
}

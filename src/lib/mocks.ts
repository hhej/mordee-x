// Canned responses for the ?mock=1 demo backup path. Lifts directly from
// src/data/demo_scenarios.json so what the audience sees on stage matches
// what the audience would have seen live — only without burning the Gemini
// quota or hitting the network.

import { getDemoScenarios, getDoctors } from '@/lib/data';
import type { TriageResult, SummaryResult, BriefResult, CheckupResult } from '@/lib/llm/schemas';

const KEYWORD_MAP: Array<{ kw: RegExp; demoId: 'PD01' | 'PD02' | 'PD03' }> = [
  { kw: /เจ็บหน้าอก|หายใจลำบาก|chest pain/i, demoId: 'PD02' },
  { kw: /ปวดท้อง|ท้องเสีย|gastro/i, demoId: 'PD01' },
  { kw: /ปวดหัว|เครียด|headache/i, demoId: 'PD03' },
];

function pickScenario(symptomText: string): 'PD01' | 'PD02' | 'PD03' {
  for (const { kw, demoId } of KEYWORD_MAP) {
    if (kw.test(symptomText)) return demoId;
  }
  return 'PD01';
}

export function mockTriage(symptomText: string): TriageResult {
  const id = pickScenario(symptomText);
  if (id === 'PD02') {
    return {
      triage: 'red',
      confidence: 0.92,
      reasoning_th:
        'อาการเจ็บหน้าอกร้าวไปแขนซ้าย หายใจลำบาก เหงื่อแตก เป็นสัญญาณภาวะหัวใจขาดเลือดเฉียบพลัน ต้องรีบไปโรงพยาบาลฉุกเฉินทันที',
      recommended_action: 'go_to_hospital',
      specialty_hint: 'ER',
      warning_signs_th: [
        'เจ็บหน้าอกร้าวไปแขนซ้าย',
        'หายใจลำบาก',
        'เหงื่อแตก',
        'อาการนานเกิน 15 นาที',
      ],
      sources: [{ title: 'AHA Chest Pain Guideline 2021', id: 'aha-2021' }],
    };
  }
  if (id === 'PD03') {
    return {
      triage: 'green',
      confidence: 0.85,
      reasoning_th:
        'อาการปวดหัวเล็กน้อยจากความเครียดและพักผ่อนน้อย สามารถดูแลตัวเองเบื้องต้นได้ แนะนำพักผ่อน ดื่มน้ำ และสังเกตอาการ',
      recommended_action: 'self_care',
      specialty_hint: 'General Practice',
      warning_signs_th: [
        'ปวดหัวรุนแรงผิดปกติ',
        'มีไข้สูง คอแข็ง',
        'ตามัว เห็นภาพซ้อน',
        'อาการแย่ลงใน 48 ชั่วโมง',
      ],
      sources: [{ title: 'Tension headache · self-care', id: 'kb-th-001' }],
    };
  }
  return {
    triage: 'yellow',
    confidence: 0.78,
    reasoning_th:
      'อาการปวดท้อง ท้องเสีย ไข้ต่ำ ๆ 2 วัน เข้าได้กับภาวะลำไส้อักเสบ ควรปรึกษาแพทย์ออนไลน์ภายในวันนี้เพื่อประเมินภาวะขาดน้ำและจ่ายยาตามอาการ',
    recommended_action: 'use_app',
    specialty_hint: 'Internal Medicine',
    warning_signs_th: [
      'ขาดน้ำรุนแรง (ปัสสาวะน้อย ปากแห้ง)',
      'ถ่ายเป็นเลือด',
      'ไข้สูงเกิน 38.5°C',
      'ปวดท้องรุนแรงผิดปกติ',
    ],
    sources: [{ title: 'Acute gastroenteritis · MoPH TH', id: 'moph-ge-2020' }],
  };
}

export function mockMatch(specialtyHint: string): Array<{
  doctor_id: string;
  score: number;
  reason_th: string;
}> {
  const all = getDoctors();
  // Prefer doctors matching the specialty hint, fall back to top of the roster.
  const matched = all.filter((d) => d.specialty === specialtyHint);
  const ordered = matched.length > 0 ? [...matched, ...all.filter((d) => d.specialty !== specialtyHint)] : all;
  return ordered.slice(0, 5).map((d, i) => ({
    doctor_id: d.id,
    score: Number((0.94 - i * 0.06).toFixed(2)),
    reason_th: `เชี่ยวชาญ ${d.specialty_th} · ประสบการณ์ ${d.years} ปี · คะแนน ${d.rating}`,
  }));
}

export function mockSummarize(): SummaryResult {
  return getDemoScenarios().doctor_demo.today_appointments[0].cached!.summary;
}

export function mockBrief(): BriefResult {
  return getDemoScenarios().doctor_demo.today_appointments[0].cached!.brief;
}

// Fixed checkup pick for the ?mock=1 demo path. CKP01 (basic annual screening)
// is the safe "fits everyone" default, so it reads sensibly for any scenario.
export function mockCheckup(): CheckupResult {
  return {
    program_id: 'CKP01',
    headline_th: 'ดูแลสุขภาพระยะยาวด้วยการตรวจสุขภาพประจำปี',
    reason_th:
      'หลังจากปรึกษาแพทย์แล้ว การตรวจสุขภาพพื้นฐานประจำปีจะช่วยติดตามภาพรวมสุขภาพของคุณ ทั้งระดับน้ำตาล ไขมัน และการทำงานของตับไต เพื่อป้องกันปัญหาก่อนลุกลามและดูแลตัวเองได้ดีขึ้นในระยะยาว',
    relevance: 'medium',
  };
}

// SSE-style chat: yield short Thai chunks with a small inter-token delay so
// the streaming UI animates. Total length kept short to keep the demo snappy.
const MOCK_CHAT_CHUNKS = [
  'สวัสดี',
  'ครับ ',
  'จากอาการ',
  'ที่เล่ามา ',
  'น่าจะ',
  'เป็นลำไส้',
  'อักเสบ',
  'นะครับ ',
  'แนะนำ',
  'ให้ดื่มน้ำ',
  'เกลือแร่',
  'เยอะ ๆ',
  ' และ',
  'พักผ่อน',
  'ครับ',
];

export async function* mockChat(): AsyncGenerator<{
  type: 'token';
  data: { text: string };
}> {
  for (const chunk of MOCK_CHAT_CHUNKS) {
    yield { type: 'token', data: { text: chunk } };
    await new Promise((r) => setTimeout(r, 80));
  }
}

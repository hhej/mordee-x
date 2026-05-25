'use client';

import { create } from 'zustand';
import type { TriageResult, SummaryResult, CheckupResult } from '@/lib/llm/schemas';
import {
  MOCK_PAYMENT_DELAY_MS,
  PAYMENT_SUCCESS_FLASH_MS,
  BLOOD_TYPES,
  type BloodType,
} from '@/lib/constants';
import {
  createAbortable,
  STREAM_TIMEOUT_TH,
  JSON_TIMEOUT_MS,
  STREAM_TIMEOUT_MS,
} from '@/lib/fetch-abort';
import { apiFetch } from '@/lib/api-client';

const abortable = createAbortable();

export type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string };
export type Gender = 'M' | 'F';
export type PatientPersona = {
  name: string;
  age: number;
  gender: Gender;
  conditions: string[];
  allergies: string[];
  medications: string;
  weightKg: number | null;
  heightCm: number | null;
  bloodType: BloodType;
};
export type RankedDoctor = { doctor_id: string; score: number; reason_th: string };

export type BookingMode = 'now' | 'scheduled';
export type PatientStep =
  | 'symptom'
  | 'doctorList'
  | 'consult'
  | 'summary'
  | 'hospital'
  | 'scheduledConfirmed';

const PERSONA_STORAGE_KEY = 'mordeeplus:patient_persona';
export const DEFAULT_PERSONA: PatientPersona = {
  name: 'คุณสมชาย',
  age: 28,
  gender: 'M',
  conditions: [],
  allergies: [],
  medications: '',
  weightKg: null,
  heightCm: null,
  bloodType: 'unknown',
};

function loadPersona(): PatientPersona {
  if (typeof window === 'undefined') return DEFAULT_PERSONA;
  try {
    const raw = window.localStorage.getItem(PERSONA_STORAGE_KEY);
    if (!raw) return DEFAULT_PERSONA;
    const parsed = JSON.parse(raw) as Partial<PatientPersona> & { history?: unknown };
    const name =
      typeof parsed.name === 'string' && parsed.name.trim().length > 0
        ? parsed.name.trim()
        : DEFAULT_PERSONA.name;
    const age =
      typeof parsed.age === 'number' && Number.isFinite(parsed.age) && parsed.age >= 1 && parsed.age <= 120
        ? parsed.age
        : DEFAULT_PERSONA.age;
    const cleanStrArr = (v: unknown): string[] =>
      Array.isArray(v)
        ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim())
        : [];
    const conditions = cleanStrArr(parsed.conditions);
    // Legacy migration: older versions stored a single `history` freetext.
    // If present and no structured conditions yet, preserve it as one chip.
    if (conditions.length === 0 && typeof parsed.history === 'string' && parsed.history.trim()) {
      conditions.push(parsed.history.trim());
    }
    const allergies = cleanStrArr(parsed.allergies);
    const medications = typeof parsed.medications === 'string' ? parsed.medications : '';
    const validNum = (v: unknown, min: number, max: number): number | null =>
      typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
    const weightKg = validNum(parsed.weightKg, 1, 500);
    const heightCm = validNum(parsed.heightCm, 30, 260);
    const bloodType: BloodType =
      typeof parsed.bloodType === 'string' &&
      (BLOOD_TYPES as readonly string[]).includes(parsed.bloodType)
        ? (parsed.bloodType as BloodType)
        : 'unknown';
    return {
      name,
      age,
      gender: parsed.gender === 'F' ? 'F' : 'M',
      conditions,
      allergies,
      medications,
      weightKg,
      heightCm,
      bloodType,
    };
  } catch {
    return DEFAULT_PERSONA;
  }
}

// Serialize the structured profile into the single bilingual block the LLM
// expects in `history`. Empty fields are omitted; returns '' when nothing to
// report, so the caller's `if (str)` guard does the right thing.
export function formatPatientHistory(p: PatientPersona): string {
  const lines: string[] = [];
  if (p.conditions.length) lines.push(`โรคประจำตัว: ${p.conditions.join(', ')}`);
  if (p.allergies.length) lines.push(`แพ้ยา: ${p.allergies.join(', ')}`);
  if (p.medications.trim()) lines.push(`ยาที่ใช้: ${p.medications.trim()}`);
  if (p.weightKg != null || p.heightCm != null) {
    const w = p.weightKg != null ? `${p.weightKg} kg` : '-';
    const h = p.heightCm != null ? `${p.heightCm} cm` : '-';
    lines.push(`น้ำหนัก/ส่วนสูง: ${w} / ${h}`);
  }
  if (p.bloodType !== 'unknown') lines.push(`กรุปเลือด: ${p.bloodType}`);
  return lines.join('\n');
}

function savePersona(p: PatientPersona): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(p));
  } catch {
    // localStorage may be unavailable (private mode, quota); ignore.
  }
}

interface PatientState {
  persona: PatientPersona;
  setPersona: (p: Partial<PatientPersona>) => void;
  hydratePersona: () => void;

  step: PatientStep;

  expandedPill: 'triage' | 'doctor' | null;
  toggleExpand: (which: 'triage' | 'doctor') => void;

  symptomText: string;
  setSymptomText: (s: string) => void;

  triage: TriageResult | null;
  isTriaging: boolean;
  triageError: string | null;
  submitSymptom: () => Promise<void>;

  matched: RankedDoctor[];
  isMatching: boolean;
  matchError: string | null;
  /** Skip symptom triage and go straight to the doctor list. */
  bypassToDoctorList: () => void;

  bookingOpen: boolean;
  selectedDoctorId: string | null;
  bookingMode: BookingMode;
  bookingSlot: string | null;
  selectDoctor: (id: string) => void;
  setBookingMode: (mode: BookingMode) => void;
  setBookingSlot: (slot: string | null) => void;
  cancelBooking: () => void;
  confirmBooking: () => void;

  paymentOpen: boolean;
  isPaying: boolean;
  paymentSuccess: boolean;
  cancelPayment: () => void;
  completePayment: () => Promise<void>;

  consultMessages: ChatMsg[];
  isStreaming: boolean;
  consultEnded: boolean;
  streamError: string | null;
  inputText: string;
  setInputText: (t: string) => void;
  kickoffConsult: () => Promise<void>;
  sendPatientMessage: (text: string) => Promise<void>;

  summary: SummaryResult | null;
  isSummarizing: boolean;
  summaryError: string | null;
  endConsult: () => Promise<void>;

  checkup: CheckupResult | null;
  isMatchingCheckup: boolean;
  checkupError: string | null;
  fetchCheckup: () => Promise<void>;

  reset: () => void;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  persona: DEFAULT_PERSONA,
  setPersona: (p) => {
    const next = { ...get().persona, ...p };
    savePersona(next);
    set({ persona: next });
  },
  hydratePersona: () => set({ persona: loadPersona() }),

  step: 'symptom',

  expandedPill: null,
  toggleExpand: (which) =>
    set({ expandedPill: get().expandedPill === which ? null : which }),

  symptomText: '',
  setSymptomText: (s) => set({ symptomText: s }),

  triage: null,
  isTriaging: false,
  triageError: null,

  submitSymptom: async () => {
    const { symptomText, persona, isTriaging } = get();
    const trimmed = symptomText.trim();
    if (!trimmed || isTriaging) return;

    const historyBlock = formatPatientHistory(persona);
    const historyLine = historyBlock ? `ประวัติ:\n${historyBlock}\n` : '';
    const symptomWithHistory = `${historyLine}อาการ: ${trimmed}`;

    set({
      isTriaging: true,
      triageError: null,
      triage: null,
      matched: [],
      matchError: null,
      consultMessages: [],
      consultEnded: false,
      streamError: null,
      summary: null,
      summaryError: null,
      checkup: null,
      isMatchingCheckup: false,
      checkupError: null,
      expandedPill: null,
    });

    const handle = abortable.newSignal(JSON_TIMEOUT_MS);
    try {
      const res = await apiFetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptom_text: symptomWithHistory }),
        signal: handle.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const triage = (await res.json()) as TriageResult;

      if (triage.triage === 'red') {
        set({ triage, isTriaging: false, step: 'hospital', expandedPill: null });
        return;
      }

      set({
        triage,
        isTriaging: false,
        step: 'doctorList',
        isMatching: true,
        expandedPill: null,
      });
      void runMatch(set, trimmed, triage.specialty_hint);
    } catch (err) {
      if (handle.isUserAbort()) {
        set({ isTriaging: false });
        return;
      }
      const isTimeout = err instanceof DOMException;
      const msg = isTimeout ? STREAM_TIMEOUT_TH : err instanceof Error ? err.message : String(err);
      set({ triageError: msg, isTriaging: false });
    }
  },

  matched: [],
  isMatching: false,
  matchError: null,
  bypassToDoctorList: () =>
    set({
      step: 'doctorList',
      triage: null,
      isTriaging: false,
      triageError: null,
      matched: [],
      isMatching: false,
      matchError: null,
      consultMessages: [],
      consultEnded: false,
      streamError: null,
      summary: null,
      summaryError: null,
      checkup: null,
      isMatchingCheckup: false,
      checkupError: null,
      expandedPill: null,
    }),

  bookingOpen: false,
  selectedDoctorId: null,
  bookingMode: 'now',
  bookingSlot: null,
  selectDoctor: (id) =>
    set({
      selectedDoctorId: id,
      bookingOpen: true,
      bookingMode: 'now',
      bookingSlot: null,
    }),
  setBookingMode: (mode) => set({ bookingMode: mode }),
  setBookingSlot: (slot) => set({ bookingSlot: slot }),
  cancelBooking: () => set({ bookingOpen: false, bookingSlot: null }),
  confirmBooking: () => set({ bookingOpen: false, paymentOpen: true }),

  paymentOpen: false,
  isPaying: false,
  paymentSuccess: false,
  cancelPayment: () => set({ paymentOpen: false, isPaying: false, paymentSuccess: false }),
  completePayment: async () => {
    // Two-phase fake payment: processing spinner → success affirmation →
    // close dialog and advance. The success flash needs to land *before*
    // paymentOpen flips false, otherwise the dialog unmounts and the user
    // sees nothing. Scheduled bookings route to a confirmation card; only
    // 'now' bookings open the chat room — kickoff is gated on step==='consult'.
    set({ isPaying: true, paymentSuccess: false });
    await new Promise((r) => setTimeout(r, MOCK_PAYMENT_DELAY_MS));
    set({ isPaying: false, paymentSuccess: true });
    await new Promise((r) => setTimeout(r, PAYMENT_SUCCESS_FLASH_MS));
    const nextStep: PatientStep =
      get().bookingMode === 'scheduled' ? 'scheduledConfirmed' : 'consult';
    set({
      paymentSuccess: false,
      paymentOpen: false,
      step: nextStep,
      consultMessages: [],
      consultEnded: false,
      streamError: null,
      summary: null,
      summaryError: null,
      checkup: null,
      isMatchingCheckup: false,
      checkupError: null,
      inputText: '',
      expandedPill: null,
    });
  },

  consultMessages: [],
  isStreaming: false,
  consultEnded: false,
  streamError: null,
  inputText: '',
  setInputText: (t) => set({ inputText: t }),

  // Opens the consult by sending the patient's opening message. If we have
  // a triage symptom_text it leads with that; otherwise (bypass flow with
  // no triage) it falls back to a generic "สวัสดี{ค่ะ/ครับ} คุณหมอ" so the
  // mock doctor naturally asks what's wrong.
  kickoffConsult: async () => {
    const { consultMessages, isStreaming, symptomText, persona } = get();
    if (consultMessages.length > 0 || isStreaming) return;
    const trimmed = symptomText.trim();
    const particle = persona.gender === 'F' ? 'ค่ะ' : 'ครับ';
    const opening = trimmed || `สวัสดี${particle} คุณหมอ`;
    await streamPatientTurn(set, get, opening);
  },

  sendPatientMessage: async (text: string) => {
    const trimmed = text.trim();
    const { isStreaming, consultEnded } = get();
    if (!trimmed || isStreaming || consultEnded) return;
    await streamPatientTurn(set, get, trimmed);
  },

  summary: null,
  isSummarizing: false,
  summaryError: null,
  endConsult: async () => {
    const { selectedDoctorId, consultMessages, persona, isSummarizing } = get();
    if (!selectedDoctorId || isSummarizing) return;
    if (consultMessages.length === 0) {
      set({
        consultEnded: true,
        step: 'summary',
        summaryError: 'ยังไม่มีบทสนทนาให้สรุป',
        expandedPill: null,
      });
      return;
    }

    // Eagerly flip step + clear stale state so the summary card mounts and
    // shows its built-in loader. On error, ConsultSummary renders the retry
    // block (onRetry calls back here).
    set({
      isSummarizing: true,
      consultEnded: true,
      step: 'summary',
      summary: null,
      summaryError: null,
      checkup: null,
      isMatchingCheckup: false,
      checkupError: null,
      expandedPill: null,
    });

    const handle = abortable.newSignal(JSON_TIMEOUT_MS);
    try {
      const res = await apiFetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: consultMessages,
          patient_name: persona.name,
          doctor_id: selectedDoctorId,
        }),
        signal: handle.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const summary = (await res.json()) as SummaryResult;
      set({ summary, isSummarizing: false });
    } catch (err) {
      if (handle.isUserAbort()) {
        set({ isSummarizing: false });
        return;
      }
      const isTimeout = err instanceof DOMException;
      const msg = isTimeout ? STREAM_TIMEOUT_TH : err instanceof Error ? err.message : String(err);
      set({ summaryError: msg, isSummarizing: false });
    }
  },

  checkup: null,
  isMatchingCheckup: false,
  checkupError: null,
  // Post-summary upsell: ask the advisor agent for one best-fit checkup program.
  // Triggered by a button in the self-care tab, so it requires a resolved summary
  // (we read the diagnosis from it). Patient-side only.
  fetchCheckup: async () => {
    const { summary, persona, triage, symptomText, isMatchingCheckup } = get();
    if (!summary || isMatchingCheckup) return;

    const bmi =
      persona.weightKg != null && persona.heightCm != null && persona.heightCm > 0
        ? persona.weightKg / (persona.heightCm / 100) ** 2
        : null;

    set({ isMatchingCheckup: true, checkupError: null, checkup: null });

    const handle = abortable.newSignal(JSON_TIMEOUT_MS);
    try {
      const res = await apiFetch('/api/checkup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: persona.age,
          gender: persona.gender === 'F' ? 'female' : 'male',
          conditions: persona.conditions,
          allergies: persona.allergies,
          bmi,
          triage: triage?.triage,
          specialty_hint: triage?.specialty_hint,
          diagnosis: summary.diagnosis,
          diagnosis_th: summary.diagnosis_th,
          icd10: summary.icd10,
          symptom_text: symptomText.trim() || undefined,
          summary_th: summary.self_care_plan.summary_th,
        }),
        signal: handle.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const checkup = (await res.json()) as CheckupResult;
      set({ checkup, isMatchingCheckup: false });
    } catch (err) {
      if (handle.isUserAbort()) {
        set({ isMatchingCheckup: false });
        return;
      }
      const isTimeout = err instanceof DOMException;
      const msg = isTimeout ? STREAM_TIMEOUT_TH : err instanceof Error ? err.message : String(err);
      set({ checkupError: msg, isMatchingCheckup: false });
    }
  },

  reset: () => {
    // Persona persists; everything else resets.
    abortable.abort();
    set({
      step: 'symptom',
      expandedPill: null,
      symptomText: '',
      triage: null,
      isTriaging: false,
      triageError: null,
      matched: [],
      isMatching: false,
      matchError: null,
      bookingOpen: false,
      selectedDoctorId: null,
      bookingMode: 'now',
      bookingSlot: null,
      paymentOpen: false,
      isPaying: false,
      paymentSuccess: false,
      consultMessages: [],
      isStreaming: false,
      consultEnded: false,
      streamError: null,
      inputText: '',
      summary: null,
      isSummarizing: false,
      summaryError: null,
      checkup: null,
      isMatchingCheckup: false,
      checkupError: null,
    });
  },
}));

type SetFn = (
  partial:
    | Partial<PatientState>
    | ((s: PatientState) => Partial<PatientState>),
) => void;

async function runMatch(
  set: SetFn,
  symptomText: string,
  specialtyHint: string,
): Promise<void> {
  const handle = abortable.newSignal(JSON_TIMEOUT_MS);
  try {
    const res = await apiFetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptom_text: symptomText, specialty_hint: specialtyHint }),
      signal: handle.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { ranked: RankedDoctor[] };
    set({ matched: body.ranked, isMatching: false });
  } catch (err) {
    if (handle.isUserAbort()) {
      set({ isMatching: false });
      return;
    }
    const isTimeout = err instanceof DOMException;
    const msg = isTimeout ? STREAM_TIMEOUT_TH : err instanceof Error ? err.message : String(err);
    set({ matchError: msg, isMatching: false });
  }
}

// Shared SSE plumbing for both kickoff and follow-up patient turns.
async function streamPatientTurn(
  set: SetFn,
  get: () => PatientState,
  text: string,
): Promise<void> {
  const { selectedDoctorId, persona, triage, symptomText, consultMessages } = get();
  if (!selectedDoctorId) {
    set({ streamError: 'ไม่ได้เลือกแพทย์ — ไม่สามารถเริ่มสนทนาได้' });
    return;
  }

  const userMsg: ChatMsg = { id: crypto.randomUUID(), role: 'user', content: text };
  const placeholder: ChatMsg = { id: crypto.randomUUID(), role: 'assistant', content: '' };
  set({
    consultMessages: [...consultMessages, userMsg, placeholder],
    isStreaming: true,
    streamError: null,
    inputText: '',
  });

  const messagesForApi: ChatMsg[] = [...consultMessages, userMsg];

  const handle = abortable.newSignal(STREAM_TIMEOUT_MS);
  try {
    const res = await apiFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'patient',
        doctor_id: selectedDoctorId,
        patient_name: persona.name,
        age: persona.age,
        gender: persona.gender === 'F' ? 'female' : 'male',
        history: formatPatientHistory(persona),
        symptom_text: symptomText,
        triage: triage?.triage,
        messages: messagesForApi,
      }),
      signal: handle.signal,
    });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const appendToken = (chunk: string) =>
      set((state: PatientState) => {
        const msgs = state.consultMessages.slice();
        const last = msgs[msgs.length - 1];
        if (last && last.role === 'assistant') {
          msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
        }
        return { consultMessages: msgs };
      });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const trimmed = frame.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        let event: { type: string; data?: { text?: string; message?: string } };
        try {
          event = JSON.parse(payload);
        } catch {
          continue;
        }
        if (event.type === 'token' && event.data?.text) {
          appendToken(event.data.text);
        } else if (event.type === 'error') {
          set({ streamError: event.data?.message ?? 'Stream error' });
        }
      }
    }
  } catch (err) {
    if (handle.isUserAbort()) {
      // User-initiated close/reset — silent. The store state is being torn
      // down by the caller, so leave streamError untouched.
      return;
    }
    const isTimeout = err instanceof DOMException;
    const msg = isTimeout ? STREAM_TIMEOUT_TH : err instanceof Error ? err.message : String(err);
    // Strip the trailing empty assistant placeholder on failure so the bubble
    // with the spinning cursor doesn't sit there forever.
    set((state: PatientState) => {
      const msgs = state.consultMessages.slice();
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant' && last.content === '') {
        msgs.pop();
      }
      return { consultMessages: msgs, streamError: msg };
    });
  } finally {
    set({ isStreaming: false });
  }
}

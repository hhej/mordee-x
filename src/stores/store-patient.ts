'use client';

import { create } from 'zustand';
import type { TriageResult, SummaryResult } from '@/lib/llm/schemas';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };
export type Gender = 'M' | 'F';
export type PatientPersona = { name: string; age: number; gender: Gender; history: string };
export type RankedDoctor = { doctor_id: string; score: number; reason_th: string };

export type BookingMode = 'now' | 'scheduled';
export type PatientStep = 'symptom' | 'doctorList' | 'consult' | 'summary' | 'hospital';

const PERSONA_STORAGE_KEY = 'mordeeplus:patient_persona';
const DEFAULT_PERSONA: PatientPersona = {
  name: 'คุณ Pol',
  age: 28,
  gender: 'M',
  history: '',
};

function loadPersona(): PatientPersona {
  if (typeof window === 'undefined') return DEFAULT_PERSONA;
  try {
    const raw = window.localStorage.getItem(PERSONA_STORAGE_KEY);
    if (!raw) return DEFAULT_PERSONA;
    const parsed = JSON.parse(raw) as Partial<PatientPersona>;
    return {
      name: typeof parsed.name === 'string' && parsed.name ? parsed.name : DEFAULT_PERSONA.name,
      age: typeof parsed.age === 'number' && parsed.age > 0 ? parsed.age : DEFAULT_PERSONA.age,
      gender: parsed.gender === 'F' ? 'F' : 'M',
      history: typeof parsed.history === 'string' ? parsed.history : DEFAULT_PERSONA.history,
    };
  } catch {
    return DEFAULT_PERSONA;
  }
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

  symptomText: '',
  setSymptomText: (s) => set({ symptomText: s }),

  triage: null,
  isTriaging: false,
  triageError: null,

  submitSymptom: async () => {
    const { symptomText, persona, isTriaging } = get();
    const trimmed = symptomText.trim();
    if (!trimmed || isTriaging) return;

    const historyLine = persona.history.trim() ? `ประวัติ: ${persona.history.trim()}\n` : '';
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
    });

    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptom_text: symptomWithHistory }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const triage = (await res.json()) as TriageResult;

      if (triage.triage === 'red') {
        set({ triage, isTriaging: false, step: 'hospital' });
        return;
      }

      set({ triage, isTriaging: false, step: 'doctorList', isMatching: true });
      void runMatch(set, trimmed, triage.specialty_hint);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
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
  cancelPayment: () => set({ paymentOpen: false, isPaying: false }),
  completePayment: async () => {
    set({ isPaying: true });
    await new Promise((r) => setTimeout(r, 2000));
    set({
      isPaying: false,
      paymentOpen: false,
      step: 'consult',
      consultMessages: [],
      consultEnded: false,
      streamError: null,
      summary: null,
      summaryError: null,
      inputText: '',
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
    });

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: consultMessages,
          patient_name: persona.name,
          doctor_id: selectedDoctorId,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const summary = (await res.json()) as SummaryResult;
      set({ summary, isSummarizing: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ summaryError: msg, isSummarizing: false });
    }
  },

  reset: () => {
    // Persona persists; everything else resets.
    set({
      step: 'symptom',
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
      consultMessages: [],
      isStreaming: false,
      consultEnded: false,
      streamError: null,
      inputText: '',
      summary: null,
      isSummarizing: false,
      summaryError: null,
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
  try {
    const res = await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptom_text: symptomText, specialty_hint: specialtyHint }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { ranked: RankedDoctor[] };
    set({ matched: body.ranked, isMatching: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
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

  const userMsg: ChatMsg = { role: 'user', content: text };
  const placeholder: ChatMsg = { role: 'assistant', content: '' };
  set({
    consultMessages: [...consultMessages, userMsg, placeholder],
    isStreaming: true,
    streamError: null,
    inputText: '',
  });

  const messagesForApi: ChatMsg[] = [...consultMessages, userMsg];

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'patient',
        doctor_id: selectedDoctorId,
        patient_name: persona.name,
        age: persona.age,
        gender: persona.gender === 'F' ? 'female' : 'male',
        history: persona.history,
        symptom_text: symptomText,
        triage: triage?.triage,
        messages: messagesForApi,
      }),
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
    const msg = err instanceof Error ? err.message : String(err);
    set({ streamError: msg });
  } finally {
    set({ isStreaming: false });
  }
}

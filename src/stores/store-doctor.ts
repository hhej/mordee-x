'use client';

import { create } from 'zustand';
import type { DoctorAppointment } from '@/lib/data';
import type { SummaryResult } from '@/lib/llm/schemas';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

interface DoctorState {
  selectedApptId: string | null;
  appointment: DoctorAppointment | null;
  doctorId: string;
  // The prebaked greeting is a UI artifact only — shown as the first bubble
  // but NOT sent to the chat LLM (Gemini rejects history that starts with
  // assistant). For the summarize transcript we DO include it though, since
  // it's the patient's opening line in the consult narrative.
  seededGreeting: string | null;
  consultMessages: ChatMsg[];
  isStreaming: boolean;
  consultEnded: boolean;
  streamError: string | null;

  summary: SummaryResult | null;
  isSummarizing: boolean;
  summaryError: string | null;

  // Lifted chat-input text so other components (brief panel, prescribe button)
  // can insert suggested text with a click.
  inputText: string;
  setInputText: (t: string) => void;

  openAppt: (appt: DoctorAppointment, doctorId: string) => void;
  closeAppt: () => void;
  sendDoctorMessage: (text: string) => Promise<void>;
  endConsult: () => Promise<void>;
}

export const useDoctorStore = create<DoctorState>((set, get) => ({
  selectedApptId: null,
  appointment: null,
  doctorId: 'D001',
  seededGreeting: null,
  consultMessages: [],
  isStreaming: false,
  consultEnded: false,
  streamError: null,
  summary: null,
  isSummarizing: false,
  summaryError: null,
  inputText: '',

  setInputText: (t) => set({ inputText: t }),

  openAppt: (appt, doctorId) => {
    set({
      selectedApptId: appt.appt_id,
      appointment: appt,
      doctorId,
      seededGreeting: appt.cached?.greeting ?? null,
      consultMessages: [],
      isStreaming: false,
      consultEnded: false,
      streamError: null,
      summary: null,
      isSummarizing: false,
      summaryError: null,
      inputText: '',
    });
  },

  closeAppt: () =>
    set({
      selectedApptId: null,
      appointment: null,
      seededGreeting: null,
      consultMessages: [],
      isStreaming: false,
      consultEnded: false,
      streamError: null,
      summary: null,
      isSummarizing: false,
      summaryError: null,
      inputText: '',
    }),

  endConsult: async () => {
    const { appointment, seededGreeting, consultMessages, doctorId, isSummarizing } = get();
    if (!appointment || isSummarizing) return;

    set({ isSummarizing: true, summaryError: null, consultEnded: true });

    // /api/summarize expects patient='user' / doctor='assistant' (patient-page
    // convention). On the doctor page our chat is the OPPOSITE: the doctor is
    // the typing user, the mock patient is 'assistant'. Flip so the summary
    // correctly attributes drugs to the doctor's lines.
    const flipped: ChatMsg[] = consultMessages.map((m) => ({
      role: m.role === 'user' ? 'assistant' : 'user',
      content: m.content,
    }));
    const transcript: ChatMsg[] = [
      ...(seededGreeting ? [{ role: 'user' as const, content: seededGreeting }] : []),
      ...flipped,
    ];

    // No conversation happened — skip live call, use prebaked.
    if (transcript.length === 0 || consultMessages.length === 0) {
      set({
        summary: appointment.cached?.summary ?? null,
        isSummarizing: false,
        summaryError: appointment.cached?.summary
          ? 'ยังไม่มีบทสนทนา — แสดงสรุปตัวอย่าง'
          : 'ไม่มีบทสนทนาให้สรุป',
      });
      return;
    }

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          patient_name: appointment.patient,
          doctor_id: doctorId,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const summary = (await res.json()) as SummaryResult;
      set({ summary, isSummarizing: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({
        summary: appointment.cached?.summary ?? null,
        summaryError: `สรุปสดล้มเหลว ใช้สรุปสำรอง (${msg})`,
        isSummarizing: false,
      });
    }
  },

  sendDoctorMessage: async (text: string) => {
    const { appointment, doctorId, consultMessages, isStreaming } = get();
    if (!appointment || isStreaming || !text.trim()) return;
    const profile = appointment.profile;
    if (!profile) {
      set({ streamError: 'ขาดข้อมูลคนไข้ ไม่สามารถเริ่มสนทนาได้' });
      return;
    }

    const userMsg: ChatMsg = { role: 'user', content: text.trim() };
    const placeholder: ChatMsg = { role: 'assistant', content: '' };
    set({
      consultMessages: [...consultMessages, userMsg, placeholder],
      isStreaming: true,
      streamError: null,
      inputText: '',
    });

    // Send only the real back-and-forth to the LLM. The seeded greeting
    // lives in seededGreeting (UI-only) and is never in consultMessages.
    const messagesForApi: ChatMsg[] = [...consultMessages, userMsg];

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'doctor',
          doctor_id: doctorId,
          patient_name: appointment.patient,
          age: profile.age,
          gender: profile.gender,
          history: profile.history,
          symptom_text: appointment.symptom,
          triage: profile.triage,
          patient_demo_brief: appointment.cached?.brief.one_liner,
          messages: messagesForApi,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const appendToken = (text: string) =>
        set((state) => {
          const msgs = state.consultMessages.slice();
          const last = msgs[msgs.length - 1];
          if (last && last.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, content: last.content + text };
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
  },
}));

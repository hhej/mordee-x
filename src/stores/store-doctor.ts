'use client';

import { create } from 'zustand';
import { getDoctor, type DoctorAppointment } from '@/lib/data';
import type { BriefResult, SummaryResult, PrescribeResult } from '@/lib/llm/schemas';
import {
  createAbortable,
  STREAM_TIMEOUT_TH,
  JSON_TIMEOUT_MS,
  STREAM_TIMEOUT_MS,
} from '@/lib/fetch-abort';
import { apiFetch } from '@/lib/api-client';
import { buildPrescriptionThai, partsFromPrescribe } from '@/lib/prescription';
import { suggestRxLocal } from '@/lib/rx-suggest';

// Two independent slots so the brief fetch and the chat stream don't fight:
// without this, sending a chat message would cancel an in-flight brief
// (createAbortable's newSignal aborts the prior controller). They get
// aborted together only on close/reset, never by each other.
const abortable = createAbortable();
const briefAbortable = createAbortable();
// Third independent slot: the "ร่างคำสั่งยา" chip's live /api/prescribe call.
// Kept separate so it never cancels (or gets cancelled by) the chat stream or
// the brief fetch; aborted together with them only on close/reset.
const rxAbortable = createAbortable();

const DOCTOR_PERSONA_KEY = 'mordeeplus:doctor_persona';

function loadDoctorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(DOCTOR_PERSONA_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveDoctorId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DOCTOR_PERSONA_KEY, id);
  } catch {
    // localStorage may be unavailable (private mode, quota); ignore.
  }
}

export type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string };

interface DoctorState {
  selectedApptId: string | null;
  appointment: DoctorAppointment | null;
  /** Empty string until the persona picker selects one; the /doctor page
   *  gates rendering on this so action methods never run without a doctor. */
  doctorId: string;
  setDoctorId: (id: string) => void;
  hydrateDoctorId: () => void;
  clearDoctorId: () => void;
  // Appointments the doctor has fully consulted on (chat → cert → close).
  // Session-only: cleared on reload, persona switch, or full reset. The
  // /doctor page filters these out of the visible queue and backfills from
  // the persona's standby pool.
  consumedApptIds: Set<string>;
  // The prebaked greeting is a UI artifact only — shown as the first bubble
  // but NOT sent to the chat LLM (Gemini rejects history that starts with
  // assistant). For the summarize transcript we DO include it though, since
  // it's the patient's opening line in the consult narrative.
  seededGreeting: string | null;
  consultMessages: ChatMsg[];
  isStreaming: boolean;
  consultEnded: boolean;
  streamError: string | null;

  // Live brief: filled by /api/brief when the appointment ships without
  // a pre-baked `cached.brief` (D003/D005 personas). D001 keeps using
  // its cached brief instantly — fetch is skipped in that case.
  liveBrief: BriefResult | null;
  isFetchingBrief: boolean;
  briefError: string | null;

  summary: SummaryResult | null;
  isSummarizing: boolean;
  summaryError: string | null;

  // Live "ร่างคำสั่งยา" chip: D001 inserts its prebaked Rx instantly (no fetch);
  // every other appointment hits /api/prescribe on click, falling back to the
  // local Rx KB on failure. isFetchingRx drives the chip's spinner/label.
  isFetchingRx: boolean;
  rxError: string | null;

  // Lifted chat-input text so other components (brief panel, prescribe button)
  // can insert suggested text with a click.
  inputText: string;
  setInputText: (t: string) => void;

  openAppt: (appt: DoctorAppointment, doctorId: string) => void;
  closeAppt: () => void;
  fetchLiveBrief: (appt: DoctorAppointment) => Promise<void>;
  fetchPrescription: () => Promise<void>;
  sendDoctorMessage: (text: string) => Promise<void>;
  endConsult: () => Promise<void>;
  reset: () => void;
}

export const useDoctorStore = create<DoctorState>((set, get) => ({
  selectedApptId: null,
  appointment: null,
  doctorId: '',
  setDoctorId: (id) => {
    saveDoctorId(id);
    set({ doctorId: id });
  },
  hydrateDoctorId: () => set({ doctorId: loadDoctorId() }),
  clearDoctorId: () => {
    saveDoctorId('');
    set({
      doctorId: '',
      selectedApptId: null,
      appointment: null,
      consumedApptIds: new Set(),
    });
  },
  consumedApptIds: new Set<string>(),
  seededGreeting: null,
  consultMessages: [],
  isStreaming: false,
  consultEnded: false,
  streamError: null,
  liveBrief: null,
  isFetchingBrief: false,
  briefError: null,
  summary: null,
  isSummarizing: false,
  summaryError: null,
  isFetchingRx: false,
  rxError: null,
  inputText: '',

  setInputText: (t) => set({ inputText: t }),

  openAppt: (appt, doctorId) => {
    const hasCachedBrief = Boolean(appt.cached?.brief);
    set({
      selectedApptId: appt.appt_id,
      appointment: appt,
      doctorId,
      seededGreeting: appt.cached?.greeting ?? null,
      consultMessages: [],
      isStreaming: false,
      consultEnded: false,
      streamError: null,
      liveBrief: null,
      // Skip the fetch entirely for cache-backed personas (D001) so we don't
      // flash a skeleton; otherwise spinner shows until /api/brief lands.
      isFetchingBrief: !hasCachedBrief && Boolean(appt.profile),
      briefError: null,
      summary: null,
      isSummarizing: false,
      summaryError: null,
      isFetchingRx: false,
      rxError: null,
      inputText: '',
    });
    if (!hasCachedBrief && appt.profile) {
      // Fire-and-forget — chat input must stay usable while the brief loads.
      void get().fetchLiveBrief(appt);
    }
  },

  closeAppt: () => {
    abortable.abort();
    briefAbortable.abort();
    rxAbortable.abort();
    // Only the cert-completion path consumes: the [X] in ConsultPanel is
    // reachable only before consultEnded flips, so an early bail-out does
    // NOT remove the appt from the queue. Both the sticky-header chevron
    // and the green "เสร็จสิ้น" button route here after consultEnded=true.
    const { consultEnded, selectedApptId, consumedApptIds } = get();
    const nextConsumed =
      consultEnded && selectedApptId
        ? new Set([...consumedApptIds, selectedApptId])
        : consumedApptIds;
    set({
      selectedApptId: null,
      appointment: null,
      seededGreeting: null,
      consultMessages: [],
      isStreaming: false,
      consultEnded: false,
      streamError: null,
      liveBrief: null,
      isFetchingBrief: false,
      briefError: null,
      summary: null,
      isSummarizing: false,
      summaryError: null,
      isFetchingRx: false,
      rxError: null,
      inputText: '',
      consumedApptIds: nextConsumed,
    });
  },

  reset: () => {
    abortable.abort();
    briefAbortable.abort();
    rxAbortable.abort();
    set({
      selectedApptId: null,
      appointment: null,
      seededGreeting: null,
      consultMessages: [],
      isStreaming: false,
      consultEnded: false,
      streamError: null,
      liveBrief: null,
      isFetchingBrief: false,
      briefError: null,
      summary: null,
      isSummarizing: false,
      summaryError: null,
      isFetchingRx: false,
      rxError: null,
      inputText: '',
      consumedApptIds: new Set(),
    });
  },

  fetchLiveBrief: async (appt) => {
    const profile = appt.profile;
    if (!profile) {
      set({ isFetchingBrief: false, briefError: 'ขาดข้อมูลคนไข้' });
      return;
    }
    const apptId = appt.appt_id;
    const handle = briefAbortable.newSignal(JSON_TIMEOUT_MS);
    try {
      const res = await apiFetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: appt.patient,
          age: profile.age,
          gender: profile.gender,
          symptom_text: appt.symptom,
          triage: profile.triage,
          history: profile.history,
        }),
        signal: handle.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const brief = (await res.json()) as BriefResult;
      // Stale-guard: the user may have switched appointments while we awaited.
      if (get().selectedApptId !== apptId) return;
      set({ liveBrief: brief, isFetchingBrief: false, briefError: null });
    } catch (err) {
      // Whatever happened — abort, timeout, or HTTP error — stop the spinner
      // if we're still on this appointment. Otherwise (user already switched/
      // closed) leave state alone; openAppt/closeAppt has reset it.
      if (get().selectedApptId !== apptId) return;
      if (handle.isUserAbort()) {
        set({ isFetchingBrief: false });
        return;
      }
      const isTimeout = err instanceof DOMException;
      const msg = isTimeout ? STREAM_TIMEOUT_TH : err instanceof Error ? err.message : String(err);
      set({ isFetchingBrief: false, briefError: msg });
    }
  },

  fetchPrescription: async () => {
    const { appointment, doctorId, consultMessages, seededGreeting, liveBrief, isFetchingRx } =
      get();
    if (!appointment || isFetchingRx) return;
    const apptId = appointment.appt_id;
    const profile = appointment.profile;
    const specialty = getDoctor(doctorId)?.specialty;
    const brief = appointment.cached?.brief ?? liveBrief;

    const insertRx = (result: PrescribeResult) =>
      set({ inputText: buildPrescriptionThai(partsFromPrescribe(result)) });

    // No structured profile → can't call the live route (needs age/gender/
    // triage). Insert a local-KB suggestion synchronously instead.
    if (!profile) {
      insertRx(suggestRxLocal(specialty, appointment.symptom, 'yellow'));
      return;
    }

    set({ isFetchingRx: true, rxError: null });

    // The doctor types as 'user' on this side; flip so the model reads the
    // doctor's lines as the doctor (same convention as endConsult).
    const transcript: ChatMsg[] = [
      ...(seededGreeting
        ? [{ id: crypto.randomUUID(), role: 'user' as const, content: seededGreeting }]
        : []),
      ...consultMessages.map((m) => ({
        id: m.id,
        role: m.role === 'user' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      })),
    ];

    const handle = rxAbortable.newSignal(JSON_TIMEOUT_MS);
    try {
      const res = await apiFetch('/api/prescribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctorId,
          patient_name: appointment.patient,
          age: profile.age,
          gender: profile.gender,
          symptom_text: appointment.symptom,
          triage: profile.triage,
          history: profile.history,
          brief_summary: brief?.one_liner,
          ddx: brief?.ddx.map((d) => d.diagnosis),
          transcript: transcript.length ? transcript : undefined,
        }),
        signal: handle.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = (await res.json()) as PrescribeResult;
      // Stale-guard: the doctor may have switched/closed appts while we awaited.
      // Without this, a slow response would clobber a different appt's input.
      if (get().selectedApptId !== apptId) return;
      insertRx(result);
      set({ isFetchingRx: false });
    } catch (err) {
      if (get().selectedApptId !== apptId) return;
      if (handle.isUserAbort()) {
        set({ isFetchingRx: false });
        return;
      }
      const isTimeout = err instanceof DOMException;
      const msg = isTimeout ? STREAM_TIMEOUT_TH : err instanceof Error ? err.message : String(err);
      // Live call failed — still hand the doctor a usable draft from the local KB.
      insertRx(suggestRxLocal(specialty, appointment.symptom, profile.triage));
      set({ isFetchingRx: false, rxError: msg });
    }
  },

  endConsult: async () => {
    const { appointment, seededGreeting, consultMessages, doctorId, isSummarizing } = get();
    if (!appointment || isSummarizing) return;

    set({ isSummarizing: true, summaryError: null, consultEnded: true });

    // /api/summarize expects patient='user' / doctor='assistant' (patient-page
    // convention). On the doctor page our chat is the OPPOSITE: the doctor is
    // the typing user, the mock patient is 'assistant'. Flip so the summary
    // correctly attributes drugs to the doctor's lines.
    const flipped: ChatMsg[] = consultMessages.map((m) => ({
      id: m.id,
      role: m.role === 'user' ? 'assistant' : 'user',
      content: m.content,
    }));
    const transcript: ChatMsg[] = [
      ...(seededGreeting
        ? [{ id: crypto.randomUUID(), role: 'user' as const, content: seededGreeting }]
        : []),
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

    const handle = abortable.newSignal(JSON_TIMEOUT_MS);
    try {
      const res = await apiFetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          patient_name: appointment.patient,
          doctor_id: doctorId,
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
      set({
        summary: appointment.cached?.summary ?? null,
        summaryError: `สรุปสดล้มเหลว ใช้สรุปสำรอง (${msg})`,
        isSummarizing: false,
      });
    }
  },

  sendDoctorMessage: async (text: string) => {
    const { appointment, doctorId, consultMessages, isStreaming, liveBrief } = get();
    if (!appointment || isStreaming || !text.trim()) return;
    const profile = appointment.profile;
    if (!profile) {
      set({ streamError: 'ขาดข้อมูลคนไข้ ไม่สามารถเริ่มสนทนาได้' });
      return;
    }

    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: 'user', content: text.trim() };
    const placeholder: ChatMsg = { id: crypto.randomUUID(), role: 'assistant', content: '' };
    set({
      consultMessages: [...consultMessages, userMsg, placeholder],
      isStreaming: true,
      streamError: null,
      inputText: '',
    });

    // Send only the real back-and-forth to the LLM. The seeded greeting
    // lives in seededGreeting (UI-only) and is never in consultMessages.
    const messagesForApi: ChatMsg[] = [...consultMessages, userMsg];

    const handle = abortable.newSignal(STREAM_TIMEOUT_MS);
    try {
      const res = await apiFetch('/api/chat', {
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
          patient_demo_brief: (appointment.cached?.brief ?? liveBrief)?.one_liner,
          messages: messagesForApi,
        }),
        signal: handle.signal,
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
      if (handle.isUserAbort()) {
        // User-initiated close/reset — state is being torn down by the caller.
        return;
      }
      const isTimeout = err instanceof DOMException;
      const msg = isTimeout ? STREAM_TIMEOUT_TH : err instanceof Error ? err.message : String(err);
      // Strip the trailing empty assistant placeholder so the spinner doesn't linger.
      set((state) => {
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
  },
}));

'use client';

import { create } from 'zustand';

// Shared appointment ledger — the single source of truth for booked consults
// (initial + follow-up) across BOTH role pages. No backend (hard rule): demo
// persistence is hand-rolled to localStorage with an SSR guard, mirroring the
// persona persistence in store-patient.ts. A follow-up booked on either side
// lands here, so it surfaces app-wide and marks its slot taken in availability.ts.

export type AppointmentKind = 'initial' | 'followup';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'declined';
export type AppointmentRole = 'patient' | 'doctor';

export interface Appointment {
  id: string;
  doctorId: string;
  patientName: string;
  /** ISO timestamp of the appointment slot. */
  slotIso: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  /** Why the follow-up was recommended (Thai). */
  reason_th?: string;
  /** Which role created it — drives copy ("คุณจอง" vs "หมอนัด"). */
  createdByRole: AppointmentRole;
  /** Links a follow-up back to its originating consult/appointment, if known. */
  parentApptId?: string;
  createdAt: string;
}

/** Input shape for addAppointment — id/status/createdAt are filled by the store. */
export type NewAppointment = Omit<Appointment, 'id' | 'status' | 'createdAt'> & {
  status?: AppointmentStatus;
};

const STORAGE_KEY = 'mordeeplus:appointments';

const KINDS: readonly AppointmentKind[] = ['initial', 'followup'];
const STATUSES: readonly AppointmentStatus[] = ['scheduled', 'completed', 'cancelled', 'declined'];
const ROLES: readonly AppointmentRole[] = ['patient', 'doctor'];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/** Validate one raw entry from storage; return a clean Appointment or null. */
function parseAppointment(raw: unknown): Appointment | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.id) || !isNonEmptyString(r.doctorId) || !isNonEmptyString(r.slotIso)) {
    return null;
  }
  if (!isNonEmptyString(r.patientName)) return null;
  // slotIso must parse to a real date.
  if (Number.isNaN(new Date(r.slotIso).getTime())) return null;
  const kind = KINDS.includes(r.kind as AppointmentKind) ? (r.kind as AppointmentKind) : null;
  const status = STATUSES.includes(r.status as AppointmentStatus)
    ? (r.status as AppointmentStatus)
    : null;
  const role = ROLES.includes(r.createdByRole as AppointmentRole)
    ? (r.createdByRole as AppointmentRole)
    : null;
  if (!kind || !status || !role) return null;
  return {
    id: r.id,
    doctorId: r.doctorId,
    patientName: r.patientName,
    slotIso: r.slotIso,
    kind,
    status,
    reason_th: isNonEmptyString(r.reason_th) ? r.reason_th : undefined,
    createdByRole: role,
    parentApptId: isNonEmptyString(r.parentApptId) ? r.parentApptId : undefined,
    createdAt: isNonEmptyString(r.createdAt) ? r.createdAt : new Date().toISOString(),
  };
}

function loadAppointments(): Appointment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseAppointment).filter((a): a is Appointment => a !== null);
  } catch {
    return [];
  }
}

function saveAppointments(list: Appointment[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage may be unavailable (private mode, quota); ignore.
  }
}

/** Realistic mock ledger used the first time the app runs in a browser. Slots
 *  are computed relative to `new Date()` so they always read as "upcoming",
 *  never stale. Tied to the demo doctors (D001/D003) and their demo patients
 *  so the doctor queue shows a believable pending follow-up out of the box. */
function seedAppointments(): Appointment[] {
  const now = new Date();
  const at = (days: number, hour: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const createdAt = now.toISOString();
  const seeds: Array<Omit<Appointment, 'id'>> = [
    {
      doctorId: 'D001',
      patientName: 'นาย สมชาย',
      slotIso: at(5, 10),
      kind: 'followup',
      status: 'scheduled',
      reason_th: 'ติดตามผลความดันโลหิตหลังปรับยา',
      createdByRole: 'doctor',
      createdAt,
    },
    {
      doctorId: 'D003',
      patientName: 'นาง สุมาลี',
      slotIso: at(9, 14),
      kind: 'followup',
      status: 'scheduled',
      reason_th: 'ติดตามอาการปวดท้องเรื้อรัง',
      createdByRole: 'doctor',
      createdAt,
    },
    {
      doctorId: 'D001',
      patientName: 'คุณสมชาย ทองดี',
      slotIso: at(6, 15),
      kind: 'followup',
      status: 'scheduled',
      reason_th: 'ติดตามผลการปรับยาความดัน',
      createdByRole: 'doctor',
      createdAt,
    },
  ];
  return seeds.map((s) => ({ ...s, id: crypto.randomUUID() }));
}

interface AppointmentState {
  appointments: Appointment[];
  /** Flips true after the first client-side hydrate; components gate future-vs-now
   *  reads on this + useNow() so SSR and first paint render an empty list. */
  hydrated: boolean;
  hydrate: () => void;

  addAppointment: (input: NewAppointment) => Appointment;
  cancel: (id: string) => void;
  decline: (id: string) => void;
  /** Put a cancelled/declined appointment back to 'scheduled' (drives undo). */
  restore: (id: string) => void;

  /** Scheduled future appointments for a patient by name, sorted by slot. */
  upcomingForPatient: (name: string, now: Date) => Appointment[];
  /** Scheduled future appointments for a doctor, sorted by slot. */
  forDoctor: (doctorId: string, now: Date) => Appointment[];
  /** Whether a doctor already has a scheduled appointment at this exact slot. */
  isSlotTaken: (doctorId: string, iso: string) => boolean;
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const loaded = loadAppointments();
    if (loaded.length > 0) {
      set({ appointments: loaded, hydrated: true });
      return;
    }
    const seeded = seedAppointments();
    saveAppointments(seeded);
    set({ appointments: seeded, hydrated: true });
  },

  addAppointment: (input) => {
    const appt: Appointment = {
      ...input,
      id: crypto.randomUUID(),
      status: input.status ?? 'scheduled',
      createdAt: new Date().toISOString(),
    };
    const next = [...get().appointments, appt];
    saveAppointments(next);
    set({ appointments: next });
    return appt;
  },

  cancel: (id) => updateStatus(set, get, id, 'cancelled'),
  decline: (id) => updateStatus(set, get, id, 'declined'),
  restore: (id) => updateStatus(set, get, id, 'scheduled'),

  upcomingForPatient: (name, now) => upcomingForPatientFrom(get().appointments, name, now),

  forDoctor: (doctorId, now) => {
    const t = now.getTime();
    return get()
      .appointments.filter(
        (a) =>
          a.doctorId === doctorId &&
          a.status === 'scheduled' &&
          new Date(a.slotIso).getTime() >= t,
      )
      .sort((a, b) => a.slotIso.localeCompare(b.slotIso));
  },

  isSlotTaken: (doctorId, iso) =>
    get().appointments.some(
      (a) => a.doctorId === doctorId && a.slotIso === iso && a.status === 'scheduled',
    ),
}));

/** Pure filter+sort for a patient's upcoming scheduled appointments. Exported so
 *  components can subscribe to the raw `appointments` array (for reactivity on
 *  add/cancel) and derive the list, while the store method reuses the same logic. */
export function upcomingForPatientFrom(
  list: Appointment[],
  name: string,
  now: Date,
): Appointment[] {
  const t = now.getTime();
  return list
    .filter(
      (a) => a.patientName === name && a.status === 'scheduled' && new Date(a.slotIso).getTime() >= t,
    )
    .sort((a, b) => a.slotIso.localeCompare(b.slotIso));
}

type SetFn = (partial: Partial<AppointmentState>) => void;
type GetFn = () => AppointmentState;

function updateStatus(set: SetFn, get: GetFn, id: string, status: AppointmentStatus): void {
  const next = get().appointments.map((a) => (a.id === id ? { ...a, status } : a));
  saveAppointments(next);
  set({ appointments: next });
}

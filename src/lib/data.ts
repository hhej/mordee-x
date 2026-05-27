import doctorsData from '@/data/doctors.json';
import hospitalsData from '@/data/hospitals.json';
import demoData from '@/data/demo_scenarios.json';
import checkupData from '@/data/checkup_programs.json';
// ML JSONs are bundled as TS imports (not fs.readFileSync) so this module
// stays client-safe — the patient page imports it from the browser. The
// notebooks write to data/ml/; re-copy into src/data/ml/ after re-running.
import noShowData from '@/data/ml/no_show_predictions.json';
import demandData from '@/data/ml/demand_forecast_7d.json';
import segmentData from '@/data/ml/patient_segments.json';
import type { BriefResult, SummaryResult } from '@/lib/llm/schemas';

export interface Doctor {
  id: string;
  name: string;
  name_en: string;
  specialty: string;
  specialty_th: string;
  gender: 'M' | 'F';
  years: number;
  rating: number;
  price: number;
  langs: string[];
  avatar: string;
  /** Thai keyword tags describing what this doctor commonly treats — feeds the embedding. */
  expertise_tags?: string[];
  // Pre-computed Gemini embeddings live in data/doctors_embeddings.json and
  // are loaded server-side via src/lib/llm/doctor-embeddings.ts. They are
  // intentionally NOT part of this client-visible interface — bundling them
  // here would re-add ~1.3 MB to every page's first-load JS.
}

export interface CheckupProgram {
  id: string;
  hospital_th: string;
  hospital_en: string;
  name_th: string;
  name_en: string;
  price: number;
  duration_th: string;
  tests_th: string[];
  ideal_for_th: string;
  /** Thai keyword blob of the symptoms/conditions this program targets — embedded for RAG retrieval. */
  match_text: string;
  tags: string[];
}

export interface Hospital {
  name: string;
  name_en: string;
  phone: string;
  emergency: string;
  address_th: string;
  address_en: string;
  hours: string;
  distance_label: string;
}

export interface PatientDemo {
  id: string;
  label: string;
  symptom_input: string;
  expected_triage: 'green' | 'yellow' | 'red';
  expected_specialty: string;
}

export interface DoctorAppointmentProfile {
  age: number;
  gender: 'male' | 'female';
  history: string;
  triage: 'green' | 'yellow' | 'red';
}

export interface DoctorAppointmentCache {
  brief: BriefResult;
  greeting: string;
  summary: SummaryResult;
}

export interface PastConsultMessage {
  role: 'patient' | 'doctor';
  content: string;
}

/** A mock prior visit, shown to the doctor for continuity of care. */
export interface PastConsult {
  /** Thai display date, e.g. "12 เม.ย. 2569". */
  date_label: string;
  /** Chief complaint that visit. */
  reason_th: string;
  doctor_name?: string;
  specialty_th?: string;
  /** Diagnosis. */
  dx_th?: string;
  /** What was prescribed / advised. */
  rx_th?: string;
  transcript: PastConsultMessage[];
}

export interface DoctorAppointment {
  appt_id: string;
  patient: string;
  time: string;
  symptom: string;
  prediction_id: string;
  profile?: DoctorAppointmentProfile;
  cached?: DoctorAppointmentCache;
  /** Prior teleconsults for this patient (mock history). Absent/empty → none. */
  past_consults?: PastConsult[];
}

export interface DoctorDemo {
  id: string;
  doctor_id: string;
  today_appointments: DoctorAppointment[];
  /** Hidden pool that backfills the visible queue as consults finish.
   *  Drawn from in order; ordering preserved across renders. */
  standby_appointments?: DoctorAppointment[];
}

export interface DemoScenarios {
  patient_demos: PatientDemo[];
  /** Legacy single-doctor demo (D001, fully pre-cached). Kept for back-compat. */
  doctor_demo: DoctorDemo;
  /** Additional doctor demos keyed by doctor_id, used by the persona picker.
   *  These are minimal (no `cached` blocks) — consult goes live via LLM. */
  doctor_demos?: Record<string, DoctorDemo>;
}

export interface NoShowPrediction {
  p_no_show: number;
  risk_tier: 'LOW' | 'MED' | 'HIGH';
  top_shap: Array<{ feature: string; value: number; shap: number }>;
  recommended_action: 'single_reminder' | 'escalated_reminder' | 'require_confirmation';
}

export interface DemandForecast {
  doctor_id: string;
  /** Specialty this forecast covers. Present since the per-specialty refactor. */
  specialty?: string;
  /** Number of doctors in this specialty — pooled demand ≈ per-doctor × doctor_count. */
  doctor_count?: number;
  horizon_days: number;
  by_hour: Array<{ datetime: string; expected_bookings: number; ci_low: number; ci_high: number }>;
  recommended_online_slots: Array<{ start: string; end: string; predicted_load: string; expected_consults: number }>;
  expected_revenue_uplift_pct: number;
  winning_model: string;
  model_mae: number | null;
}

/** Shape of data/ml/demand_forecast_7d.json after the per-specialty refactor:
 *  forecasts keyed by specialty slug, plus a back-compat `DD01` alias. */
interface DemandData {
  by_specialty: Record<string, DemandForecast>;
  DD01: DemandForecast;
}

/** One cohort from the patient-segmentation notebook (nb04). `profile` holds the
 *  cluster's centroid stats in ORIGINAL units (e.g. mean bookings, no-show rate). */
export interface PatientSegment {
  id: number;
  label_th: string;
  label_en: string;
  /** Hex colour from the mint/triage palette — tracks the persona's meaning. */
  color: string;
  size: number;
  pct: number;
  profile: Record<string, number>;
  recommended_action_th: string;
}

/** One row of the unsupervised model bake-off (KMeans vs Agglomerative vs GMM). */
export interface SegmentModelRow {
  algorithm: string;
  silhouette: number;
  davies_bouldin: number;
  calinski_harabasz: number;
  winner: boolean;
}

export interface SegmentMeta {
  n_patients: number;
  k: number;
  chosen_algorithm: string;
  feature_set: string[];
  /** Variance explained by PC1, PC2 — captions the scatter. */
  pca_explained_variance: number[];
  k_selection: { k_values: number[]; inertia: number[]; silhouette: number[] };
  model_comparison: SegmentModelRow[];
  random_state: number;
}

/** Shape of data/ml/patient_segments.json (nb04). `by_scenario` maps a patient
 *  id — a real sampled `user_id` or a demo appointment id (A001…) — to a
 *  segment id, so the dashboard can look up a cohort by scenario id. */
export interface PatientSegmentsData {
  meta: SegmentMeta;
  segments: PatientSegment[];
  scatter: Array<{ x: number; y: number; segment_id: number }>;
  by_scenario: Record<string, number>;
}

const doctors = doctorsData as Doctor[];
const hospitals = hospitalsData as Hospital[];
const checkupPrograms = checkupData as CheckupProgram[];
const demoScenarios = demoData as DemoScenarios;
const noShowMap = noShowData as Record<string, NoShowPrediction>;
const demand = demandData as unknown as DemandData;
const segments = segmentData as unknown as PatientSegmentsData;

export function getDoctors(): Doctor[] {
  return doctors;
}

export function getDoctor(id: string): Doctor | undefined {
  return doctors.find((d) => d.id === id);
}

export function getHospitals(): Hospital[] {
  return hospitals;
}

export function getDemoScenarios(): DemoScenarios {
  return demoScenarios;
}

/** Look up the demo (today's appointments + ML predictions key) for a given
 *  logged-in doctor. Falls through `doctor_demos` map first, then the legacy
 *  D001 entry. Returns undefined for doctors with no demo data. */
export function getDoctorDemo(doctorId: string): DoctorDemo | undefined {
  if (demoScenarios.doctor_demos && demoScenarios.doctor_demos[doctorId]) {
    return demoScenarios.doctor_demos[doctorId];
  }
  if (demoScenarios.doctor_demo.doctor_id === doctorId) {
    return demoScenarios.doctor_demo;
  }
  return undefined;
}

/** Doctor IDs that have an interactive demo queue — used by the persona picker. */
export const DOCTOR_PERSONA_IDS = ['D001', 'D003', 'D005'] as const;

export function getPatientDemo(id: string): PatientDemo | undefined {
  return demoScenarios.patient_demos.find((p) => p.id === id);
}

export function getNoShow(id: string): NoShowPrediction | undefined {
  return noShowMap[id];
}

/** The full patient-segmentation payload (meta + segments + scatter) — the
 *  doctor dashboard cohorts card consumes this whole object. */
export function getSegments(): PatientSegmentsData {
  return segments;
}

/** Resolve a patient's cohort by scenario id (a sampled `user_id` or a demo
 *  appointment id like "A001"), via the notebook's `by_scenario` map. */
export function getPatientSegment(scenarioId: string): PatientSegment | undefined {
  const segId = segments.by_scenario[scenarioId];
  if (segId === undefined) return undefined;
  return segments.segments.find((s) => s.id === segId);
}

/** Compute the demand-forecast key for a specialty (mirrors the notebook's
 *  slugify): lowercase, non-letters → '-', trimmed. e.g. "OB-GYN" → "ob-gyn". */
export function specialtySlug(specialty: string): string {
  return specialty
    .toLowerCase()
    .replace(/[^a-z]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Back-compat lookup by raw key (DD01 alias or a specialty slug). */
export function getDemand(id: string): DemandForecast | undefined {
  if (id === 'DD01') return demand.DD01;
  return demand.by_specialty[id];
}

/** Canonical resolver: a doctor inherits its specialty's pooled forecast.
 *  Falls back to the GP/DD01 forecast if the specialty has no entry. */
export function getDemandForDoctor(doctorId: string): DemandForecast | undefined {
  const doc = getDoctor(doctorId);
  if (!doc) return undefined;
  return demand.by_specialty[specialtySlug(doc.specialty)] ?? demand.DD01;
}

export function getRosterSpecialties(): string[] {
  return Array.from(new Set(doctors.map((d) => d.specialty))).sort();
}

// EN→TH specialty lookup, derived from the roster so it auto-covers every
// doctor.specialty / specialty_th pair (no separate mapping table to drift).
// The LLM contract + matching stay English (specialty_hint, doctor.specialty);
// this exists only to render the hint in Thai, matching doctor.specialty_th in
// the UI. 'ER' isn't a doctor specialty, so it's special-cased; unmapped values
// fall through to the input string so a label never renders blank.
const SPECIALTY_TH: Record<string, string> = {
  ...Object.fromEntries(doctors.map((d) => [d.specialty, d.specialty_th])),
  ER: 'ฉุกเฉิน',
};

export function getSpecialtyTh(specialtyEn: string): string {
  return SPECIALTY_TH[specialtyEn] ?? specialtyEn;
}

export function getCheckupPrograms(): CheckupProgram[] {
  return checkupPrograms;
}

export function getCheckupProgram(id: string): CheckupProgram | undefined {
  return checkupPrograms.find((p) => p.id === id);
}

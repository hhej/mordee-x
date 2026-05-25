import doctorsData from '@/data/doctors.json';
import hospitalsData from '@/data/hospitals.json';
import demoData from '@/data/demo_scenarios.json';
import checkupData from '@/data/checkup_programs.json';
// ML JSONs are bundled as TS imports (not fs.readFileSync) so this module
// stays client-safe — the patient page imports it from the browser. The
// notebooks write to data/ml/; re-copy into src/data/ml/ after re-running.
import noShowData from '@/data/ml/no_show_predictions.json';
import demandData from '@/data/ml/demand_forecast_7d.json';
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

export interface DoctorAppointment {
  appt_id: string;
  patient: string;
  time: string;
  symptom: string;
  prediction_id: string;
  profile?: DoctorAppointmentProfile;
  cached?: DoctorAppointmentCache;
}

export interface DoctorDemo {
  id: string;
  doctor_id: string;
  today_appointments: DoctorAppointment[];
}

export interface DemoScenarios {
  patient_demos: PatientDemo[];
  doctor_demo: DoctorDemo;
}

export interface NoShowPrediction {
  p_no_show: number;
  risk_tier: 'LOW' | 'MED' | 'HIGH';
  top_shap: Array<{ feature: string; value: number; shap: number }>;
  recommended_action: 'single_reminder' | 'escalated_reminder' | 'require_confirmation';
}

export interface DemandForecast {
  doctor_id: string;
  horizon_days: number;
  by_hour: Array<{ datetime: string; expected_bookings: number; ci_low: number; ci_high: number }>;
  recommended_online_slots: Array<{ start: string; end: string; predicted_load: string; expected_consults: number }>;
  expected_revenue_uplift_pct: number;
  winning_model: string;
  model_mae: number;
}

const doctors = doctorsData as Doctor[];
const hospitals = hospitalsData as Hospital[];
const checkupPrograms = checkupData as CheckupProgram[];
const demoScenarios = demoData as DemoScenarios;
const noShowMap = noShowData as Record<string, NoShowPrediction>;
const demandMap = demandData as Record<string, DemandForecast>;

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

export function getPatientDemo(id: string): PatientDemo | undefined {
  return demoScenarios.patient_demos.find((p) => p.id === id);
}

export function getNoShow(id: string): NoShowPrediction | undefined {
  return noShowMap[id];
}

export function getDemand(id: string): DemandForecast | undefined {
  return demandMap[id];
}

export function getRosterSpecialties(): string[] {
  return Array.from(new Set(doctors.map((d) => d.specialty))).sort();
}

export function getCheckupPrograms(): CheckupProgram[] {
  return checkupPrograms;
}

export function getCheckupProgram(id: string): CheckupProgram | undefined {
  return checkupPrograms.find((p) => p.id === id);
}

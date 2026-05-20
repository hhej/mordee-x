import { z } from 'zod';
import { getRosterSpecialties } from '@/lib/data';

const SPECIALTY_VALUES = [...getRosterSpecialties(), 'ER'] as unknown as [string, ...string[]];

export const SpecialtyHintSchema = z.enum(SPECIALTY_VALUES);

export const TriageSchema = z.object({
  triage: z.enum(['green', 'yellow', 'red']),
  confidence: z.number().min(0).max(1),
  reasoning_th: z.string(),
  recommended_action: z.enum(['self_care', 'use_app', 'go_to_hospital']),
  specialty_hint: SpecialtyHintSchema,
  warning_signs_th: z.array(z.string()),
  sources: z.array(z.object({ title: z.string(), id: z.string() })),
});
export type TriageResult = z.infer<typeof TriageSchema>;

export const MatchReasonSchema = z.object({
  reason_th: z.string(),
});

export const BriefSchema = z.object({
  one_liner: z.string(),
  key_symptoms: z.array(z.string()),
  history_flags: z.array(z.string()),
  ddx: z.array(
    z.object({
      diagnosis: z.string(),
      likelihood: z.enum(['high', 'medium', 'low']),
      rationale: z.string(),
    }),
  ),
  suggested_questions_th: z.array(z.string()),
  red_flags: z.array(z.string()),
});
export type BriefResult = z.infer<typeof BriefSchema>;

export const MedicationSchema = z.object({
  name_th: z.string(),
  dose_th: z.string(),
  frequency_th: z.string(),
  duration_th: z.string(),
  with_food: z.boolean(),
});

export const SelfCarePlanSchema = z.object({
  summary_th: z.string(),
  medications: z.array(MedicationSchema),
  diet_th: z.array(z.string()),
  avoid_th: z.array(z.string()),
  rest_advice_th: z.string(),
  warning_signs_th: z.array(z.string()),
  recovery_timeline_th: z.string(),
});

export const SummarySchema = z.object({
  diagnosis: z.string(),
  diagnosis_th: z.string(),
  icd10: z.string(),
  certificate_text_th: z.string(),
  self_care_plan: SelfCarePlanSchema,
  needs_followup: z.boolean(),
  followup_in_days: z.number().nullable(),
  followup_reason_th: z.string().nullable(),
});
export type SummaryResult = z.infer<typeof SummarySchema>;

// ----- Request body schemas -----

export const TriageRequestSchema = z.object({
  symptom_text: z.string().min(1),
});

export const MatchRequestSchema = z.object({
  symptom_text: z.string().min(1),
  specialty_hint: z.string(),
});

export const BriefRequestSchema = z.object({
  patient_name: z.string(),
  age: z.number().int().min(0),
  gender: z.string(),
  symptom_text: z.string(),
  triage: z.enum(['green', 'yellow', 'red']),
  history: z.string().optional(),
});

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const ChatRequestSchema = z.object({
  role: z.enum(['patient', 'doctor']),
  messages: z.array(ChatMessageSchema),
  doctor_id: z.string(),
  patient_name: z.string(),
  triage: z.enum(['green', 'yellow', 'red']).optional(),
  symptom_text: z.string().optional(),
  age: z.number().int().optional(),
  gender: z.string().optional(),
  history: z.string().optional(),
  patient_demo_brief: z.string().optional(),
});

export const SummarizeRequestSchema = z.object({
  transcript: z.array(ChatMessageSchema),
  patient_name: z.string(),
  doctor_id: z.string(),
});

export const PredictQuerySchema = z.object({
  type: z.enum(['no_show', 'demand']),
  id: z.string().min(1),
});

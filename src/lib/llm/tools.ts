import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { embedModel } from '@/lib/llm/client';
import { topK } from '@/lib/rag';
import { getDoctor, getNoShow, getDemandForDoctor } from '@/lib/data';

export const lookupSymptomKb = tool(
  async ({ query }) => {
    const embedding = await embedModel.embedQuery(query);
    const hits = await topK(embedding, 3);
    const result = hits.map(({ entry, score }) => ({
      id: entry.id,
      title: entry.title,
      title_th: entry.title_th,
      severity: entry.severity,
      guidance_th: entry.guidance_th,
      specialty_hint: entry.specialty_hint,
      source: entry.source,
      score: Number(score.toFixed(4)),
    }));
    return JSON.stringify(result);
  },
  {
    name: 'lookup_symptom_kb',
    description:
      'Look up the top-3 closest entries in the MorDee+ symptom knowledge base by semantic similarity to the given query. Returns id, title, severity, Thai guidance, specialty hint, and source for each hit. Use this to ground medical reasoning in published guidelines.',
    schema: z.object({
      query: z.string().describe('Symptom description in Thai or English'),
    }),
  },
);

export const getNoShowRisk = tool(
  async ({ prediction_id }) => {
    const pred = getNoShow(prediction_id);
    if (!pred) return JSON.stringify({ error: `No prediction found for id ${prediction_id}` });
    return JSON.stringify(pred);
  },
  {
    name: 'get_no_show_risk',
    description:
      'Get the no-show risk prediction for an upcoming appointment by prediction id (e.g. NS001). Returns p_no_show, risk_tier (LOW/MED/HIGH), top SHAP features, and recommended_action.',
    schema: z.object({
      prediction_id: z.string().describe('Prediction id such as NS001, NS002, NS003'),
    }),
  },
);

export const getDemandForecast = tool(
  async ({ doctor_id }) => {
    const forecast = getDemandForDoctor(doctor_id);
    if (!forecast) {
      return JSON.stringify({ error: `No demand forecast for doctor ${doctor_id}` });
    }
    const summary = {
      doctor_id,
      specialty: forecast.specialty,
      doctor_count: forecast.doctor_count,
      horizon_days: forecast.horizon_days,
      recommended_online_slots: forecast.recommended_online_slots,
      expected_revenue_uplift_pct: forecast.expected_revenue_uplift_pct,
      winning_model: forecast.winning_model,
      model_mae: forecast.model_mae,
      peak_hours_summary: forecast.by_hour
        .slice()
        .sort((a, b) => b.expected_bookings - a.expected_bookings)
        .slice(0, 5),
    };
    return JSON.stringify(summary);
  },
  {
    name: 'get_demand_forecast',
    description:
      "Get the 7-day demand forecast for a doctor (resolved by the doctor's specialty — pooled demand if several doctors share it). Returns the specialty, doctor_count, recommended online consultation slots, expected revenue uplift, model metadata, and the top-5 peak booking hours.",
    schema: z.object({
      doctor_id: z.string().describe('Doctor id, D001 through D033'),
    }),
  },
);

export const getDoctorProfile = tool(
  async ({ doctor_id }) => {
    const doc = getDoctor(doctor_id);
    if (!doc) return JSON.stringify({ error: `No doctor found for id ${doctor_id}` });
    return JSON.stringify(doc);
  },
  {
    name: 'get_doctor_profile',
    description:
      'Get a doctor profile by id (e.g. D001). Returns name, specialty, years of experience, rating, price, languages, and avatar.',
    schema: z.object({
      doctor_id: z.string().describe('Doctor id such as D001 through D033'),
    }),
  },
);

export const chatTools = [lookupSymptomKb, getNoShowRisk, getDemandForecast, getDoctorProfile];

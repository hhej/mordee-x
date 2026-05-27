import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { chatModel, embedModel, llmTimeoutSignal } from '@/lib/llm/client';
import { SYSTEM_MATCH } from '@/lib/llm/prompts';
import { MatchReasonSchema } from '@/lib/llm/schemas';
import { getDoctors, type Doctor } from '@/lib/data';
import { cosineSimilarity } from '@/lib/rag';
import { getDoctorEmbedding, ensureDoctorEmbeddings } from '@/lib/llm/doctor-embeddings';

export interface MatchInput {
  symptom_text: string;
  specialty_hint: string;
}

export interface RankedDoctor {
  doctor_id: string;
  score: number;
  reason_th: string;
}

interface ScoredDoctor {
  doctor: Doctor;
  score: number;
}

export type MatchEvent =
  | { type: 'doctor'; data: RankedDoctor }
  | { type: 'done'; data: { total: number } }
  | { type: 'error'; data: { message: string } };

// Hybrid scoring: specialty enum hit (rules), semantic similarity (cosine on
// pre-embedded doctor profile vs the patient's symptom embedding), and rating
// as a tie-breaker. The doctor embedding is fetched from a server-only JSON
// (data/doctors_embeddings.json) so it stays out of the client bundle.
function scoreDoctor(
  doctor: Doctor,
  specialtyHint: string,
  symptomEmbedding: number[] | null,
): number {
  const specialtyHit = doctor.specialty === specialtyHint ? 1 : 0;
  const ratingNorm = doctor.rating / 5;
  const doctorEmbedding = getDoctorEmbedding(doctor.id);
  const cosine =
    symptomEmbedding && doctorEmbedding
      ? Math.max(0, cosineSimilarity(symptomEmbedding, doctorEmbedding))
      : 0;
  // Weights: 0.40 specialty rule · 0.40 semantic match · 0.20 rating.
  // When embeddings are missing, specialty still dominates so the demo never
  // regresses against the prior pure-rules behavior.
  return specialtyHit * 0.4 + cosine * 0.4 + ratingNorm * 0.2;
}

async function pickTop3(input: MatchInput): Promise<ScoredDoctor[]> {
  if (input.specialty_hint === 'ER') return [];

  // Embed once per match request. If embedding fails (network/quota), degrade
  // gracefully to rule-only scoring rather than failing the whole match. The
  // doctor-embedding cache is warmed concurrently (DB-first, JSON fallback) so
  // it overlaps the Gemini call and adds no latency to the hot path.
  let symptomEmbedding: number[] | null = null;
  try {
    const [, embedding] = await Promise.all([
      ensureDoctorEmbeddings(),
      embedModel().embedQuery(input.symptom_text),
    ]);
    symptomEmbedding = embedding;
  } catch (err) {
    console.warn('[match] symptom embedding failed, falling back to rules-only', err);
  }

  return getDoctors()
    .map((doctor) => ({
      doctor,
      score: scoreDoctor(doctor, input.specialty_hint, symptomEmbedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function buildReasonPrompt(doctor: Doctor, input: MatchInput): string {
  return [
    `Patient symptoms: ${input.symptom_text}`,
    `Specialty needed: ${input.specialty_hint}`,
    '',
    'Doctor profile:',
    `- ชื่อ: ${doctor.name}`,
    `- เชี่ยวชาญ: ${doctor.specialty_th}`,
    `- ประสบการณ์: ${doctor.years} ปี`,
    `- คะแนนรีวิว: ${doctor.rating}/5`,
    `- ภาษา: ${doctor.langs.join(', ')}`,
    `- ราคา: ${doctor.price} บาท`,
    '',
    'Write the matching reason as JSON.',
  ].join('\n');
}

// Async generator that yields each enriched doctor as its LLM reasoning resolves.
// The patient page consumes this via SSE so the first doctor card paints in
// ~2-3s instead of waiting for the slowest of three parallel structured calls.
export async function* streamMatch(input: MatchInput): AsyncGenerator<MatchEvent> {
  const top = await pickTop3(input);
  if (top.length === 0) {
    yield { type: 'done', data: { total: 0 } };
    return;
  }

  const llm = chatModel({ temperature: 0.3 });
  const structured = llm.withStructuredOutput(MatchReasonSchema);

  const tasks = top.map(async ({ doctor, score }, idx) => {
    try {
      const result = (await structured.invoke(
        [new SystemMessage(SYSTEM_MATCH), new HumanMessage(buildReasonPrompt(doctor, input))],
        { signal: llmTimeoutSignal() },
      )) as { reason_th: string };
      return {
        idx,
        ranked: {
          doctor_id: doctor.id,
          score: Number(score.toFixed(3)),
          reason_th: result.reason_th,
        },
      };
    } catch (err) {
      // Per-doctor fallback so one slow Gemini call doesn't blank the whole list.
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[match] reason failed for ${doctor.id}:`, message);
      return {
        idx,
        ranked: {
          doctor_id: doctor.id,
          score: Number(score.toFixed(3)),
          reason_th: `${doctor.specialty_th} · ประสบการณ์ ${doctor.years} ปี · เรตติ้ง ${doctor.rating}/5`,
        },
      };
    }
  });

  // Yield each result as it lands. Map keyed by original index lets us drop
  // the resolved promise without object-identity tracking on Promise.race.
  const pending = new Map<number, Promise<{ idx: number; ranked: RankedDoctor }>>();
  tasks.forEach((task, i) => pending.set(i, task));
  while (pending.size > 0) {
    const winner = await Promise.race(pending.values());
    pending.delete(winner.idx);
    yield { type: 'doctor', data: winner.ranked };
  }
  yield { type: 'done', data: { total: top.length } };
}

// Back-compat wrapper for any non-streaming caller (tests, mocks).
export async function runMatch(input: MatchInput): Promise<RankedDoctor[]> {
  const out: RankedDoctor[] = [];
  for await (const event of streamMatch(input)) {
    if (event.type === 'doctor') out.push(event.data);
  }
  return out;
}

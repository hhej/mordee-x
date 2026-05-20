import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { chatModel } from '@/lib/llm/client';
import { SYSTEM_MATCH } from '@/lib/llm/prompts';
import { MatchReasonSchema } from '@/lib/llm/schemas';
import { getDoctors, type Doctor } from '@/lib/data';

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

const MatchState = Annotation.Root({
  input: Annotation<MatchInput>(),
  top: Annotation<ScoredDoctor[]>(),
  ranked: Annotation<RankedDoctor[]>(),
});

function scoreDoctor(doctor: Doctor, specialtyHint: string): number {
  const specialtyMatch = doctor.specialty === specialtyHint ? 1 : 0;
  const ratingScore = doctor.rating / 5;
  return specialtyMatch * 0.7 + ratingScore * 0.3;
}

async function rankNode(state: typeof MatchState.State) {
  const { specialty_hint } = state.input;
  if (specialty_hint === 'ER') {
    return { top: [] };
  }
  const scored = getDoctors()
    .map((doctor) => ({ doctor, score: scoreDoctor(doctor, specialty_hint) }))
    .sort((a, b) => b.score - a.score);
  return { top: scored.slice(0, 3) };
}

async function reasonNode(state: typeof MatchState.State) {
  if (state.top.length === 0) return { ranked: [] };
  const llm = chatModel({ temperature: 0.3 });
  const structured = llm.withStructuredOutput(MatchReasonSchema);

  const ranked = await Promise.all(
    state.top.map(async ({ doctor, score }) => {
      const userMessage = [
        `Patient symptoms: ${state.input.symptom_text}`,
        `Specialty needed: ${state.input.specialty_hint}`,
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

      const result = (await structured.invoke([
        new SystemMessage(SYSTEM_MATCH),
        new HumanMessage(userMessage),
      ])) as { reason_th: string };

      return {
        doctor_id: doctor.id,
        score: Number(score.toFixed(3)),
        reason_th: result.reason_th,
      };
    }),
  );

  return { ranked };
}

const graph = new StateGraph(MatchState)
  .addNode('rank', rankNode)
  .addNode('reason', reasonNode)
  .addEdge(START, 'rank')
  .addEdge('rank', 'reason')
  .addEdge('reason', END)
  .compile();

export async function runMatch(input: MatchInput): Promise<RankedDoctor[]> {
  const result = await graph.invoke({ input });
  return result.ranked ?? [];
}

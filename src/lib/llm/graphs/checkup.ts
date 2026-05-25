import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { chatModel } from '@/lib/llm/client';
import { SYSTEM_CHECKUP } from '@/lib/llm/prompts';
import { CheckupRecommendationSchema, type CheckupResult } from '@/lib/llm/schemas';
import { getCheckupPrograms } from '@/lib/data';
import type { CheckupRequest } from '@/lib/llm/schemas';

export type CheckupInput = CheckupRequest;

// Fallback when the model returns an id outside the catalog — the basic annual
// screening is the safe "fits everyone" default (belt-and-suspenders, mirrors
// the triage validator pattern).
const FALLBACK_PROGRAM_ID = 'CKP01';

const CheckupGraphState = Annotation.Root({
  input: Annotation<CheckupInput>(),
  recommendation: Annotation<CheckupResult | null>(),
});

function catalogBlock(): string {
  return getCheckupPrograms()
    .map((p) =>
      [
        `- id: ${p.id}`,
        `  hospital: ${p.hospital_th} (${p.hospital_en})`,
        `  name: ${p.name_th} (${p.name_en})`,
        `  price: ${p.price} THB`,
        `  ideal_for: ${p.ideal_for_th}`,
        `  tags: ${p.tags.join(', ')}`,
      ].join('\n'),
    )
    .join('\n');
}

function patientBlock(input: CheckupInput): string {
  const lines = [
    `Age: ${input.age}`,
    `Gender: ${input.gender}`,
    `Conditions: ${input.conditions.length ? input.conditions.join(', ') : 'none reported'}`,
    `Allergies: ${input.allergies.length ? input.allergies.join(', ') : 'none reported'}`,
  ];
  if (input.bmi != null) lines.push(`BMI: ${input.bmi.toFixed(1)}`);
  if (input.specialty_hint) lines.push(`Triage specialty hint: ${input.specialty_hint}`);
  if (input.triage) lines.push(`Triage level: ${input.triage}`);
  lines.push(`Consult diagnosis: ${input.diagnosis} / ${input.diagnosis_th} (ICD-10 ${input.icd10})`);
  return lines.join('\n');
}

async function recommendNode(state: typeof CheckupGraphState.State) {
  const userMessage = [
    'PATIENT CONTEXT:',
    patientBlock(state.input),
    '',
    'AVAILABLE CHECKUP PROGRAMS (pick exactly one program_id from this list):',
    catalogBlock(),
    '',
    'Recommend the single best-fit program as JSON.',
  ].join('\n');

  const llm = chatModel({ temperature: 0.3 });
  const structured = llm.withStructuredOutput(CheckupRecommendationSchema);
  const recommendation = (await structured.invoke([
    new SystemMessage(SYSTEM_CHECKUP),
    new HumanMessage(userMessage),
  ])) as CheckupResult;

  // Validate the chosen id against the real catalog; fall back if hallucinated.
  const valid = getCheckupPrograms().some((p) => p.id === recommendation.program_id);
  if (!valid) {
    return { recommendation: { ...recommendation, program_id: FALLBACK_PROGRAM_ID } };
  }
  return { recommendation };
}

const graph = new StateGraph(CheckupGraphState)
  .addNode('recommend', recommendNode)
  .addEdge(START, 'recommend')
  .addEdge('recommend', END)
  .compile();

export async function runCheckup(input: CheckupInput): Promise<CheckupResult> {
  const result = await graph.invoke({ input });
  if (!result.recommendation) throw new Error('Checkup graph did not produce a result');
  return result.recommendation;
}

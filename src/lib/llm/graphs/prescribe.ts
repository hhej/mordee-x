import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { chatModel, llmTimeoutSignal } from '@/lib/llm/client';
import { SYSTEM_PRESCRIBE } from '@/lib/llm/prompts';
import { PrescribeSchema, type PrescribeResult, type PrescribeRequest } from '@/lib/llm/schemas';
import { getDoctor } from '@/lib/data';

const TRIAGE_TH: Record<'green' | 'yellow' | 'red', string> = {
  green: 'เขียว (ดูแลตัวเองได้)',
  yellow: 'เหลือง (ควรพบแพทย์)',
  red: 'แดง (อาจเป็นภาวะฉุกเฉิน)',
};

const PrescribeStateGraph = Annotation.Root({
  input: Annotation<PrescribeRequest>(),
  result: Annotation<PrescribeResult | null>(),
});

async function prescribeNode(state: typeof PrescribeStateGraph.State) {
  const { input } = state;
  const doctor = getDoctor(input.doctor_id);
  const specialty = doctor ? `${doctor.specialty} (${doctor.specialty_th})` : 'General Practice';

  const recentTranscript = (input.transcript ?? [])
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'patient' : 'doctor'}: ${m.content}`)
    .join('\n');

  const userMessage = [
    `Patient: ${input.patient_name}, อายุ ${input.age} ปี, เพศ ${input.gender}`,
    `Triage: ${TRIAGE_TH[input.triage]}`,
    `Specialty of attending doctor: ${specialty}`,
    `Chief complaint / symptom: ${input.symptom_text}`,
    input.history ? `History: ${input.history}` : '',
    input.brief_summary ? `Pre-consult brief: ${input.brief_summary}` : '',
    input.ddx?.length ? `Differential diagnoses: ${input.ddx.join(', ')}` : '',
    recentTranscript ? `Consultation so far:\n${recentTranscript}` : '',
    '',
    'Draft a starting prescription as JSON per the schema.',
  ]
    .filter(Boolean)
    .join('\n');

  const llm = chatModel({ temperature: 0.2 });
  const structured = llm.withStructuredOutput(PrescribeSchema);
  const result = (await structured.invoke(
    [new SystemMessage(SYSTEM_PRESCRIBE), new HumanMessage(userMessage)],
    { signal: llmTimeoutSignal() },
  )) as PrescribeResult;
  return { result };
}

const graph = new StateGraph(PrescribeStateGraph)
  .addNode('prescribe', prescribeNode)
  .addEdge(START, 'prescribe')
  .addEdge('prescribe', END)
  .compile();

export async function runPrescribe(input: PrescribeRequest): Promise<PrescribeResult> {
  const result = await graph.invoke({ input });
  if (!result.result) throw new Error('Prescribe graph did not produce a result');
  return result.result;
}

import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { chatModel } from '@/lib/llm/client';
import { SYSTEM_SUMMARY } from '@/lib/llm/prompts';
import { SummarySchema, type SummaryResult } from '@/lib/llm/schemas';
import { getDoctor } from '@/lib/data';

export interface SummarizeInput {
  transcript: Array<{ role: 'user' | 'assistant'; content: string }>;
  patient_name: string;
  doctor_id: string;
}

const SummarizeState = Annotation.Root({
  input: Annotation<SummarizeInput>(),
  summary: Annotation<SummaryResult | null>(),
});

async function summarizeNode(state: typeof SummarizeState.State) {
  const doctor = getDoctor(state.input.doctor_id);
  if (!doctor) {
    throw new Error(`Doctor ${state.input.doctor_id} not found`);
  }

  const transcriptText = state.input.transcript
    .map((m) => `${m.role === 'user' ? 'patient' : 'doctor'}: ${m.content}`)
    .join('\n');

  const userMessage = [
    'Consultation transcript:',
    transcriptText,
    '',
    `Patient: ${state.input.patient_name}`,
    `Doctor: ${doctor.name} (${doctor.specialty_th})`,
    '',
    'Generate the certificate and self-care plan as JSON.',
  ].join('\n');

  const llm = chatModel({ temperature: 0.2 });
  const structured = llm.withStructuredOutput(SummarySchema);
  const summary = (await structured.invoke([
    new SystemMessage(SYSTEM_SUMMARY),
    new HumanMessage(userMessage),
  ])) as SummaryResult;
  return { summary };
}

const graph = new StateGraph(SummarizeState)
  .addNode('summarize', summarizeNode)
  .addEdge(START, 'summarize')
  .addEdge('summarize', END)
  .compile();

export async function runSummarize(input: SummarizeInput): Promise<SummaryResult> {
  const result = await graph.invoke({ input });
  if (!result.summary) throw new Error('Summarize graph did not produce a result');
  return result.summary;
}

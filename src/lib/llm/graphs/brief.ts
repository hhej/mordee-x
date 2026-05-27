import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { chatModel, embedModel, llmTimeoutSignal } from '@/lib/llm/client';
import { SYSTEM_BRIEF } from '@/lib/llm/prompts';
import { BriefSchema, type BriefResult } from '@/lib/llm/schemas';
import { topK, type RagHit } from '@/lib/rag';

export interface BriefInput {
  patient_name: string;
  age: number;
  gender: string;
  symptom_text: string;
  triage: 'green' | 'yellow' | 'red';
  history?: string;
}

const BriefState = Annotation.Root({
  input: Annotation<BriefInput>(),
  ragHits: Annotation<RagHit[]>(),
  brief: Annotation<BriefResult | null>(),
});

async function retrieveNode(state: typeof BriefState.State) {
  const embedding = await embedModel().embedQuery(state.input.symptom_text);
  const ragHits = await topK(embedding, 3);
  return { ragHits };
}

async function generateNode(state: typeof BriefState.State) {
  const llm = chatModel({ temperature: 0.3 });
  const structured = llm.withStructuredOutput(BriefSchema);
  const ragContext = state.ragHits
    .map(
      (h, i) =>
        `${i + 1}. [${h.entry.title}] severity=${h.entry.severity} · ${h.entry.guidance_en} (source: ${h.entry.source})`,
    )
    .join('\n');

  const userMessage = [
    'Patient intake:',
    `- Name: ${state.input.patient_name}`,
    `- Age: ${state.input.age}`,
    `- Gender: ${state.input.gender}`,
    `- Reported symptoms: ${state.input.symptom_text}`,
    `- Triage tier: ${state.input.triage}`,
    `- History: ${state.input.history ?? 'None reported'}`,
    '',
    'RAG context (top medical guidelines for these symptoms):',
    ragContext,
    '',
    'Generate the pre-consult brief as JSON.',
  ].join('\n');

  const brief = (await structured.invoke(
    [new SystemMessage(SYSTEM_BRIEF), new HumanMessage(userMessage)],
    { signal: llmTimeoutSignal() },
  )) as BriefResult;
  return { brief };
}

const graph = new StateGraph(BriefState)
  .addNode('retrieve', retrieveNode)
  .addNode('generate', generateNode)
  .addEdge(START, 'retrieve')
  .addEdge('retrieve', 'generate')
  .addEdge('generate', END)
  .compile();

export async function runBrief(input: BriefInput): Promise<BriefResult> {
  const result = await graph.invoke({ input });
  if (!result.brief) throw new Error('Brief graph did not produce a result');
  return result.brief;
}

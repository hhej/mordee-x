import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { chatModel, embedModel, llmTimeoutSignal } from '@/lib/llm/client';
import { SYSTEM_TRIAGE } from '@/lib/llm/prompts';
import { TriageSchema, type TriageResult } from '@/lib/llm/schemas';
import { topK, type RagHit } from '@/lib/rag';
import { detectRedKeywords, redKeywordValidator } from '@/lib/safety/red_keywords';

const TriageState = Annotation.Root({
  symptom_text: Annotation<string>(),
  embedding: Annotation<number[]>(),
  ragHits: Annotation<RagHit[]>(),
  llmTriage: Annotation<TriageResult | null>(),
  finalTriage: Annotation<TriageResult | null>(),
  gateHit: Annotation<boolean>(),
});

async function gateNode(state: typeof TriageState.State) {
  const matches = detectRedKeywords(state.symptom_text);
  if (matches.length === 0) return { gateHit: false };
  const matched = matches.map((m) => m.matched).join(', ');
  return {
    gateHit: true,
    finalTriage: {
      triage: 'red' as const,
      confidence: 1.0,
      reasoning_th: `ตรวจพบสัญญาณฉุกเฉิน (${matched}) กรุณาหยุดใช้แอป โทร 1669 หรือไปโรงพยาบาลใกล้บ้านทันที`,
      recommended_action: 'go_to_hospital' as const,
      specialty_hint: 'ER',
      warning_signs_th: ['เจ็บหน้าอกรุนแรง', 'หายใจไม่ออก', 'หมดสติ', 'อาการแย่ลงเร็ว'],
      sources: [],
    },
  };
}

async function embedNode(state: typeof TriageState.State) {
  const embedding = await embedModel.embedQuery(state.symptom_text);
  return { embedding };
}

async function retrieveNode(state: typeof TriageState.State) {
  const ragHits = await topK(state.embedding, 3);
  return { ragHits };
}

async function classifyNode(state: typeof TriageState.State) {
  const llm = chatModel({ temperature: 0.2 });
  const structured = llm.withStructuredOutput(TriageSchema);
  const userMessage = [
    'Retrieved KB entries (top-3 by symptom similarity):',
    ...state.ragHits.map(
      (h, i) =>
        `${i + 1}. [${h.entry.title}] severity=${h.entry.severity}, guidance: ${h.entry.guidance_th}`,
    ),
    '',
    'Patient symptom description:',
    `"${state.symptom_text}"`,
    '',
    'Classify and respond as JSON per the schema.',
  ].join('\n');

  const llmTriage = (await structured.invoke(
    [new SystemMessage(SYSTEM_TRIAGE), new HumanMessage(userMessage)],
    { signal: llmTimeoutSignal() },
  )) as TriageResult;

  const sources =
    llmTriage.sources && llmTriage.sources.length > 0
      ? llmTriage.sources
      : state.ragHits.map((h) => ({ title: h.entry.title, id: h.entry.id }));

  return { llmTriage: { ...llmTriage, sources } };
}

async function validatorNode(state: typeof TriageState.State) {
  if (!state.llmTriage) return {};
  const corrected = redKeywordValidator(state.symptom_text, state.llmTriage.triage);
  if (corrected === state.llmTriage.triage) {
    return { finalTriage: state.llmTriage };
  }
  return {
    finalTriage: {
      ...state.llmTriage,
      triage: corrected,
      recommended_action: 'go_to_hospital' as const,
      specialty_hint: 'ER',
    },
  };
}

const graph = new StateGraph(TriageState)
  .addNode('gate', gateNode)
  .addNode('embed', embedNode)
  .addNode('retrieve', retrieveNode)
  .addNode('classify', classifyNode)
  .addNode('validator', validatorNode)
  .addEdge(START, 'gate')
  .addConditionalEdges('gate', (state) => (state.gateHit ? END : 'embed'), {
    [END]: END,
    embed: 'embed',
  })
  .addEdge('embed', 'retrieve')
  .addEdge('retrieve', 'classify')
  .addEdge('classify', 'validator')
  .addEdge('validator', END)
  .compile();

export async function runTriage(symptom_text: string): Promise<TriageResult> {
  const result = await graph.invoke({ symptom_text });
  if (!result.finalTriage) {
    throw new Error('Triage graph did not produce a final result');
  }
  return result.finalTriage;
}

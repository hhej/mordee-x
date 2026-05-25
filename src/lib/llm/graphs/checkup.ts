import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { chatModel, embedModel, llmTimeoutSignal } from '@/lib/llm/client';
import { SYSTEM_CHECKUP } from '@/lib/llm/prompts';
import { CheckupRecommendationSchema, type CheckupResult } from '@/lib/llm/schemas';
import { getCheckupPrograms, getCheckupProgram, type CheckupProgram } from '@/lib/data';
import { cosineSimilarity } from '@/lib/rag';
import type { CheckupRequest } from '@/lib/llm/schemas';

export type CheckupInput = CheckupRequest;

// How many similarity-retrieved programs the LLM gets to choose its final pick from.
const TOP_K = 3;

// ----- Catalog embedding (RAG corpus) -----
// The catalog is static, so we embed it once per server lifetime and cache the
// vectors in-process (no external vector DB, per plan §16). We cache the promise
// rather than the value so concurrent first-requests share a single embed call.
type CatalogVector = { id: string; embedding: number[] };
let catalogPromise: Promise<CatalogVector[]> | null = null;

function programEmbedText(p: CheckupProgram): string {
  return `${p.name_th}. ${p.ideal_for_th}. ${p.match_text}. ${p.tags.join(' ')}`;
}

async function ensureCatalogEmbeddings(): Promise<CatalogVector[]> {
  if (!catalogPromise) {
    const programs = getCheckupPrograms();
    catalogPromise = embedModel
      .embedDocuments(programs.map(programEmbedText))
      .then((vectors) => programs.map((p, i) => ({ id: p.id, embedding: vectors[i] })))
      .catch((err) => {
        catalogPromise = null; // allow retry on a later request if embedding failed
        throw err;
      });
  }
  return catalogPromise;
}

function buildQueryText(input: CheckupInput): string {
  return [
    input.diagnosis_th,
    input.symptom_text ?? '',
    input.summary_th ?? '',
    input.conditions.length ? `โรคประจำตัว: ${input.conditions.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('. ');
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

function candidateBlock(ids: string[]): string {
  return ids
    .map((id) => getCheckupProgram(id))
    .filter((p): p is CheckupProgram => Boolean(p))
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

const CheckupGraphState = Annotation.Root({
  input: Annotation<CheckupInput>(),
  queryEmbedding: Annotation<number[]>(),
  topIds: Annotation<string[]>(),
  recommendation: Annotation<CheckupResult | null>(),
});

async function embedQueryNode(state: typeof CheckupGraphState.State) {
  const queryEmbedding = await embedModel.embedQuery(buildQueryText(state.input));
  return { queryEmbedding };
}

async function retrieveNode(state: typeof CheckupGraphState.State) {
  const catalog = await ensureCatalogEmbeddings();
  const scored = catalog
    .map((v) => ({ id: v.id, score: cosineSimilarity(state.queryEmbedding, v.embedding) }))
    .sort((a, b) => b.score - a.score);
  return { topIds: scored.slice(0, TOP_K).map((s) => s.id) };
}

async function recommendNode(state: typeof CheckupGraphState.State) {
  const topIds = state.topIds;
  const userMessage = [
    'PATIENT CONTEXT:',
    patientBlock(state.input),
    '',
    `CANDIDATE CHECKUP PROGRAMS (retrieved by similarity — pick exactly one program_id from this list):`,
    candidateBlock(topIds),
    '',
    'Recommend the single best-fit program as JSON.',
  ].join('\n');

  const llm = chatModel({ temperature: 0.3 });
  const structured = llm.withStructuredOutput(CheckupRecommendationSchema);
  const recommendation = (await structured.invoke(
    [new SystemMessage(SYSTEM_CHECKUP), new HumanMessage(userMessage)],
    { signal: llmTimeoutSignal() },
  )) as CheckupResult;

  // The pick must be one of the retrieved candidates; otherwise fall back to the
  // top similarity hit (belt-and-suspenders, mirrors the triage validator).
  if (!topIds.includes(recommendation.program_id)) {
    return { recommendation: { ...recommendation, program_id: topIds[0] } };
  }
  return { recommendation };
}

const graph = new StateGraph(CheckupGraphState)
  .addNode('embedQuery', embedQueryNode)
  .addNode('retrieve', retrieveNode)
  .addNode('recommend', recommendNode)
  .addEdge(START, 'embedQuery')
  .addEdge('embedQuery', 'retrieve')
  .addEdge('retrieve', 'recommend')
  .addEdge('recommend', END)
  .compile();

export async function runCheckup(input: CheckupInput): Promise<CheckupResult> {
  const result = await graph.invoke({ input });
  if (!result.recommendation) throw new Error('Checkup graph did not produce a result');
  return result.recommendation;
}

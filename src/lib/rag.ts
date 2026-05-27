import fs from 'node:fs';
import path from 'node:path';
import { dbTopKSymptoms } from '@/lib/db';

export interface SymptomKbEntry {
  id: string;
  title: string;
  title_th: string;
  severity: 'green' | 'yellow' | 'red';
  guidance_th: string;
  guidance_en: string;
  specialty_hint: string;
  source: string;
  embedding: number[];
}

const KB_PATH = path.join(process.cwd(), 'data', 'symptom_kb.json');

// Lazy + guarded load (mirrors doctor-embeddings.ts:loadFromDisk). Reading at the
// module top level meant a missing/corrupt file threw at *import* time, taking
// down every route that imports this module — defeating the DB-first/JSON-fallback
// "retrieval never fails" guarantee. Now a bad file degrades to an empty KB (no
// grounding) instead of a crash; the DB path is unaffected.
let kbCache: SymptomKbEntry[] | null = null;
function loadKb(): SymptomKbEntry[] {
  if (kbCache) return kbCache;
  try {
    kbCache = JSON.parse(fs.readFileSync(KB_PATH, 'utf-8')) as SymptomKbEntry[];
  } catch (err) {
    console.warn('[rag] failed to load symptom_kb.json — retrieval will return no grounding', err);
    kbCache = [];
  }
  return kbCache;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  // Guard the failure modes that silently produce NaN (and thus garbage ranking):
  // differing dimensions (short b → undefined arithmetic) and zero vectors (÷0).
  // Either case → 0 similarity.
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RagHit {
  entry: SymptomKbEntry;
  score: number;
}

// DB-first: similarity search runs in Postgres/pgvector. On any DB miss/error
// (e.g. unprovisioned or unreachable) we fall back to in-memory cosine over the
// bundled symptom_kb.json so retrieval never fails during the demo.
export async function topK(queryEmbedding: number[], k = 3): Promise<RagHit[]> {
  const dbHits = await dbTopKSymptoms(queryEmbedding, k);
  if (dbHits) return dbHits;

  const scored = loadKb().map((entry) => ({
    entry,
    score: cosineSimilarity(queryEmbedding, entry.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export function kbSize(): number {
  return loadKb().length;
}

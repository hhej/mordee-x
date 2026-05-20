import fs from 'node:fs';
import path from 'node:path';

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
const kb: SymptomKbEntry[] = JSON.parse(fs.readFileSync(KB_PATH, 'utf-8'));

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RagHit {
  entry: SymptomKbEntry;
  score: number;
}

export function topK(queryEmbedding: number[], k = 3): RagHit[] {
  const scored = kb.map((entry) => ({
    entry,
    score: cosineSimilarity(queryEmbedding, entry.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export function kbSize(): number {
  return kb.length;
}

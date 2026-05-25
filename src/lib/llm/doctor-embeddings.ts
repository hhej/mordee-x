import fs from 'node:fs';
import path from 'node:path';

// Server-only lookup table for the pre-computed Gemini doctor embeddings.
// Lives outside the client bundle (data/ is loaded via fs.readFileSync at
// module init, same pattern as src/lib/rag.ts) so the ~1.3 MB vector matrix
// never ships to the browser. Generated/refreshed by scripts/embed-doctors.ts.

const EMBEDDINGS_PATH = path.join(process.cwd(), 'data', 'doctors_embeddings.json');

let cache: Record<string, number[]> | null = null;

function load(): Record<string, number[]> {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, 'utf-8')) as Record<string, number[]>;
  } catch (err) {
    console.warn('[doctor-embeddings] failed to load — falling back to rules-only match', err);
    cache = {};
  }
  return cache;
}

export function getDoctorEmbedding(id: string): number[] | undefined {
  return load()[id];
}

import fs from 'node:fs';
import path from 'node:path';
import { dbGetDoctorEmbeddings } from '@/lib/db';

// Server-only lookup table for the pre-computed Gemini doctor embeddings.
// DB-FIRST WITH JSON FALLBACK: the vectors live in the pgvector `doctor_embeddings`
// table; ensureDoctorEmbeddings() loads them ONCE into this in-process cache. If
// the DB is unavailable we fall back to the bundled data/doctors_embeddings.json
// (~1.3 MB, loaded via fs so it never ships to the client — same pattern as rag.ts).
//
// Performance: matching scores all 15 doctors per request with synchronous cosine
// in JS (the right choice for a handful of vectors). The one-time cache fill is a
// single query that the matcher overlaps with its Gemini embed call (match.ts), so
// it adds no wall-clock latency; subsequent requests hit the cache — zero DB calls.

const EMBEDDINGS_PATH = path.join(process.cwd(), 'data', 'doctors_embeddings.json');

let cache: Record<string, number[]> | null = null;

function loadFromDisk(): Record<string, number[]> {
  try {
    return JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, 'utf-8')) as Record<string, number[]>;
  } catch (err) {
    console.warn('[doctor-embeddings] failed to load — falling back to rules-only match', err);
    return {};
  }
}

/** Populate the cache once (DB-first, JSON fallback). Safe to call every request —
 *  it no-ops after the first successful fill and never throws. */
export async function ensureDoctorEmbeddings(): Promise<void> {
  if (cache && Object.keys(cache).length > 0) return;
  const fromDb = await dbGetDoctorEmbeddings();
  cache = fromDb ?? loadFromDisk();
}

export function getDoctorEmbedding(id: string): number[] | undefined {
  // Safety net: if scoring ever runs before ensureDoctorEmbeddings(), load disk.
  if (!cache) cache = loadFromDisk();
  return cache[id];
}

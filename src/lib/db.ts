// Server-only data access for the Neon Postgres backend (ML artifacts + RAG via
// pgvector). DB-FIRST WITH JSON FALLBACK: every function returns null on a miss
// or ANY error, so callers fall back to the bundled JSON (src/lib/data.ts /
// src/lib/rag.ts). The DB is the runtime source of truth; the JSON files are the
// offline safety net so the live demo can never break (see scripts/seed-neon.mjs).
//
// Only ever imported server-side (rag.ts uses node:fs; the /api/predict route is
// a route handler). Never import this from a client component.
import { neon } from '@neondatabase/serverless';
import type { SymptomKbEntry, RagHit } from '@/lib/rag';
import type { PatientSegment, PatientSegmentsData, SegmentMeta } from '@/lib/data';

// Neon (Vercel Marketplace, Free plan) injects POSTGRES_URL; DATABASE_URL is the
// conventional alias. Empty string ⇒ no DB provisioned ⇒ everything falls back.
const CONNECTION = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? '';

export function dbAvailable(): boolean {
  return CONNECTION.length > 0;
}

// Lazy singleton — only constructed when a connection string exists.
let client: ReturnType<typeof neon> | null = null;
function sql() {
  if (!CONNECTION) return null;
  if (!client) client = neon(CONNECTION);
  return client;
}

/** One ML artifact payload by (kind, key). null on miss/error → caller falls back. */
export async function dbGetMlArtifact(kind: string, key: string): Promise<unknown | null> {
  const db = sql();
  if (!db) return null;
  try {
    const rows = (await db`SELECT payload FROM ml_artifacts WHERE kind = ${kind} AND key = ${key} LIMIT 1`) as Array<{
      payload: unknown;
    }>;
    return rows.length ? rows[0].payload : null;
  } catch (err) {
    console.warn('[db] dbGetMlArtifact failed — falling back to JSON', err);
    return null;
  }
}

// Row shape of patient_segments → maps 1:1 to the PatientSegment interface.
type SegRow = {
  id: number;
  label_th: string;
  label_en: string;
  color: string;
  size: number;
  pct: number | string;
  recommended_action_th: string;
  profile: Record<string, number>;
};
const toSegment = (r: SegRow): PatientSegment => ({
  id: Number(r.id),
  label_th: r.label_th,
  label_en: r.label_en,
  color: r.color,
  size: Number(r.size),
  pct: Number(r.pct),
  profile: r.profile,
  recommended_action_th: r.recommended_action_th,
});

/** Reassemble the full patient-segmentation payload (meta + segments + scatter +
 *  by_scenario) from the normalized tables. null if unseeded/error → JSON fallback. */
export async function dbGetSegments(): Promise<PatientSegmentsData | null> {
  const db = sql();
  if (!db) return null;
  try {
    const [metaRows, segRows, scatterRows, assignRows] = (await Promise.all([
      db`SELECT payload FROM segment_meta WHERE id = 1`,
      db`SELECT id, label_th, label_en, color, size, pct, recommended_action_th, profile
         FROM patient_segments ORDER BY id`,
      db`SELECT x, y, segment_id FROM segment_scatter`,
      db`SELECT scenario_id, segment_id FROM segment_assignments`,
    ])) as [
      Array<{ payload: SegmentMeta }>,
      SegRow[],
      Array<{ x: number | string; y: number | string; segment_id: number }>,
      Array<{ scenario_id: string; segment_id: number }>,
    ];
    if (metaRows.length === 0 || segRows.length === 0) return null;
    const by_scenario: Record<string, number> = {};
    for (const r of assignRows) by_scenario[r.scenario_id] = Number(r.segment_id);
    return {
      meta: metaRows[0].payload,
      segments: segRows.map(toSegment),
      scatter: scatterRows.map((r) => ({ x: Number(r.x), y: Number(r.y), segment_id: Number(r.segment_id) })),
      by_scenario,
    };
  } catch (err) {
    console.warn('[db] dbGetSegments failed — falling back to JSON', err);
    return null;
  }
}

/** Resolve a patient's cohort by scenario id via a JOIN on the normalized tables.
 *  Mirrors getPatientSegment() in data.ts. null on miss/error → JSON fallback. */
export async function dbGetPatientSegment(scenarioId: string): Promise<PatientSegment | null> {
  const db = sql();
  if (!db) return null;
  try {
    const rows = (await db`
      SELECT ps.id, ps.label_th, ps.label_en, ps.color, ps.size, ps.pct,
             ps.recommended_action_th, ps.profile
      FROM segment_assignments sa
      JOIN patient_segments ps ON ps.id = sa.segment_id
      WHERE sa.scenario_id = ${scenarioId}
      LIMIT 1`) as SegRow[];
    return rows.length ? toSegment(rows[0]) : null;
  } catch (err) {
    console.warn('[db] dbGetPatientSegment failed — falling back to JSON', err);
    return null;
  }
}

/** All doctor-matching embeddings in ONE round-trip, as a { id → vector } map.
 *  null on error → doctor-embeddings.ts falls back to the bundled JSON. Loaded
 *  once and cached by the caller, so this never runs on the per-request hot path. */
export async function dbGetDoctorEmbeddings(): Promise<Record<string, number[]> | null> {
  const db = sql();
  if (!db) return null;
  try {
    const rows = (await db`SELECT id, vec_json FROM doctor_embeddings`) as Array<{
      id: string;
      vec_json: number[];
    }>;
    if (rows.length === 0) return null;
    const map: Record<string, number[]> = {};
    for (const r of rows) map[r.id] = r.vec_json;
    return map;
  } catch (err) {
    console.warn('[db] dbGetDoctorEmbeddings failed — falling back to JSON', err);
    return null;
  }
}

/** Top-k symptom-KB hits by cosine similarity, computed IN THE DATABASE via
 *  pgvector (`<=>` = cosine distance; similarity = 1 − distance). null on
 *  error → rag.ts falls back to in-memory cosine over the bundled JSON. */
export async function dbTopKSymptoms(embedding: number[], k = 3): Promise<RagHit[] | null> {
  const db = sql();
  if (!db) return null;
  try {
    const vec = `[${embedding.join(',')}]`;
    const rows = (await db`
      SELECT payload, 1 - (embedding <=> ${vec}::vector) AS score
      FROM symptom_kb
      ORDER BY embedding <=> ${vec}::vector
      LIMIT ${k}`) as Array<{ payload: SymptomKbEntry; score: number | string }>;
    return rows.map((r) => ({ entry: r.payload, score: Number(r.score) }));
  } catch (err) {
    console.warn('[db] dbTopKSymptoms failed — falling back to JSON', err);
    return null;
  }
}

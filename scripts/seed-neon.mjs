// Seed the Neon Postgres backend (ML artifacts + RAG knowledge base) from the
// existing JSON files — no data regeneration, so the DB payloads match the TS
// interfaces in src/lib/data.ts / src/lib/rag.ts exactly (trivial fallback parity).
//
// Prereq: a Neon connection string. After adding Neon (Free) via the Vercel
// Marketplace, run `vercel env pull .env.local`, then:  pnpm db:seed
// (loads DATABASE_URL / POSTGRES_URL from .env.local or .env automatically).
import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf-8'));

// Minimal .env loader so `node scripts/seed-neon.mjs` just works after env pull.
for (const file of ['.env.local', '.env']) {
  const full = path.join(ROOT, file);
  if (!existsSync(full)) continue;
  for (const line of readFileSync(full, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const CONNECTION = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!CONNECTION) {
  console.error('✗ No DATABASE_URL / POSTGRES_URL. Run `vercel env pull .env.local` first.');
  process.exit(1);
}
const sql = neon(CONNECTION);

async function main() {
  console.log('→ Creating extension + tables…');
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql`CREATE TABLE IF NOT EXISTS ml_artifacts (
    kind text NOT NULL,
    key text NOT NULL,
    payload jsonb NOT NULL,
    PRIMARY KEY (kind, key)
  )`;
  // 3072-d to match the app's gemini-embedding-001 query embedding (nb03 seed).
  await sql`CREATE TABLE IF NOT EXISTS symptom_kb (
    id text PRIMARY KEY,
    payload jsonb NOT NULL,
    embedding vector(3072) NOT NULL
  )`;
  // Doctor-matching embeddings (gemini-embedding-001 default = 3072-d). Stored in
  // a pgvector column; vec_json holds the full-precision array for fast retrieval
  // into the in-process matcher cache (see src/lib/llm/doctor-embeddings.ts).
  await sql`CREATE TABLE IF NOT EXISTS doctor_embeddings (
    id text PRIMARY KEY,
    embedding vector(3072) NOT NULL,
    vec_json jsonb NOT NULL
  )`;
  // Patient segmentation (k-means, nb04) — normalized into real relational tables:
  // one row per cluster, plus patient→cluster assignments, PCA scatter, and meta.
  await sql`CREATE TABLE IF NOT EXISTS patient_segments (
    id int PRIMARY KEY,
    label_th text NOT NULL,
    label_en text NOT NULL,
    color text NOT NULL,
    size int NOT NULL,
    pct real NOT NULL,
    recommended_action_th text NOT NULL,
    profile jsonb NOT NULL
  )`;
  await sql`CREATE TABLE IF NOT EXISTS segment_assignments (
    scenario_id text PRIMARY KEY,
    segment_id int NOT NULL REFERENCES patient_segments(id)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS segment_scatter (
    id bigserial PRIMARY KEY,
    x double precision NOT NULL,
    y double precision NOT NULL,
    segment_id int NOT NULL REFERENCES patient_segments(id)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS segment_meta (
    id smallint PRIMARY KEY DEFAULT 1,
    payload jsonb NOT NULL
  )`;

  console.log('→ Clearing existing rows…');
  await sql`TRUNCATE ml_artifacts`;
  await sql`TRUNCATE symptom_kb`;
  await sql`TRUNCATE doctor_embeddings`;
  // One statement so the FK refs (assignments/scatter → patient_segments) are satisfied.
  await sql`TRUNCATE patient_segments, segment_assignments, segment_scatter, segment_meta CASCADE`;

  // --- ML outputs (read from src/data/ml/* = exactly what lib/data.ts bundles) ---
  const upsertArtifact = (kind, key, payload) => sql`
    INSERT INTO ml_artifacts (kind, key, payload)
    VALUES (${kind}, ${key}, ${JSON.stringify(payload)}::jsonb)
    ON CONFLICT (kind, key) DO UPDATE SET payload = EXCLUDED.payload`;

  const noShow = read('src/data/ml/no_show_predictions.json'); // { NS001: {...}, ... }
  for (const [key, payload] of Object.entries(noShow)) {
    await upsertArtifact('no_show', key, payload);
  }
  console.log(`  no_show: ${Object.keys(noShow).length} rows`);

  const demand = read('src/data/ml/demand_forecast_7d.json'); // { by_specialty: {slug:{}}, DD01:{} }
  let demandCount = 0;
  for (const [slug, payload] of Object.entries(demand.by_specialty)) {
    await upsertArtifact('demand', slug, payload);
    demandCount++;
  }
  await upsertArtifact('demand', 'DD01', demand.DD01); // GP alias used by getDemand('DD01')
  demandCount++;
  console.log(`  demand: ${demandCount} rows`);

  // --- Patient segmentation (k-means) → normalized tables ---
  const seg = read('src/data/ml/patient_segments.json'); // { meta, segments, scatter, by_scenario }
  for (const s of seg.segments) {
    await sql`
      INSERT INTO patient_segments (id, label_th, label_en, color, size, pct, recommended_action_th, profile)
      VALUES (${s.id}, ${s.label_th}, ${s.label_en}, ${s.color}, ${s.size}, ${s.pct},
              ${s.recommended_action_th}, ${JSON.stringify(s.profile)}::jsonb)`;
  }
  await sql`INSERT INTO segment_meta (id, payload) VALUES (1, ${JSON.stringify(seg.meta)}::jsonb)`;
  // Batched multi-row inserts (one round-trip each) for the larger child tables.
  const assignEntries = Object.entries(seg.by_scenario);
  if (assignEntries.length) {
    const vals = assignEntries.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
    await sql.query(
      `INSERT INTO segment_assignments (scenario_id, segment_id) VALUES ${vals}`,
      assignEntries.flat(),
    );
  }
  if (seg.scatter.length) {
    const vals = seg.scatter.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(',');
    await sql.query(
      `INSERT INTO segment_scatter (x, y, segment_id) VALUES ${vals}`,
      seg.scatter.flatMap((p) => [p.x, p.y, p.segment_id]),
    );
  }
  console.log(`  patient_segments: ${seg.segments.length} clusters · ${assignEntries.length} assignments · ${seg.scatter.length} scatter pts · 1 meta`);

  // --- RAG knowledge base → pgvector (read from data/symptom_kb.json = rag.ts source) ---
  const kb = read('data/symptom_kb.json'); // [{ id, ...fields, embedding: number[3072] }]
  for (const entry of kb) {
    const vec = `[${entry.embedding.join(',')}]`;
    await sql`
      INSERT INTO symptom_kb (id, payload, embedding)
      VALUES (${entry.id}, ${JSON.stringify(entry)}::jsonb, ${vec}::vector)
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, embedding = EXCLUDED.embedding`;
  }
  console.log(`  symptom_kb: ${kb.length} rows (3072-d vectors)`);

  // --- Doctor embeddings → pgvector (read from data/doctors_embeddings.json) ---
  const docEmb = read('data/doctors_embeddings.json'); // { D001: number[3072], ... }
  let docCount = 0;
  for (const [id, vec] of Object.entries(docEmb)) {
    const lit = `[${vec.join(',')}]`;
    await sql`
      INSERT INTO doctor_embeddings (id, embedding, vec_json)
      VALUES (${id}, ${lit}::vector, ${JSON.stringify(vec)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET embedding = EXCLUDED.embedding, vec_json = EXCLUDED.vec_json`;
    docCount++;
  }
  console.log(`  doctor_embeddings: ${docCount} rows (3072-d vectors)`);

  console.log('✓ Seed complete.');
}

main().catch((err) => {
  console.error('✗ Seed failed:', err);
  process.exit(1);
});

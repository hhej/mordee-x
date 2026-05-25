// Pre-compute Gemini embeddings for every doctor in src/data/doctors.json
// and store them in data/doctors_embeddings.json (server-only, outside the
// client bundle). The match graph reads these to score symptom→doctor
// semantic similarity without paying an embedding cost per request.
//
// Run with:  ./node_modules/.bin/tsx scripts/embed-doctors.ts
// Idempotent — only embeds doctors that don't yet have a vector in the
// embeddings file. Pass --force to re-embed everything (e.g., after editing
// expertise_tags).

process.loadEnvFile('.env');

import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

interface DoctorRecord {
  id: string;
  specialty: string;
  specialty_th: string;
  expertise_tags?: string[];
  [k: string]: unknown;
}

const FORCE = process.argv.includes('--force');
const DOCTORS_PATH = path.join(process.cwd(), 'src', 'data', 'doctors.json');
const EMBEDDINGS_PATH = path.join(process.cwd(), 'data', 'doctors_embeddings.json');

function embedText(d: DoctorRecord): string {
  const tags = d.expertise_tags ?? [];
  return `${d.specialty_th} ${d.specialty} ${tags.join(' ')}`.trim();
}

function loadEmbeddings(): Record<string, number[]> {
  if (!fs.existsSync(EMBEDDINGS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, 'utf-8')) as Record<string, number[]>;
  } catch (err) {
    console.warn('Could not parse existing embeddings file — starting fresh.', err);
    return {};
  }
}

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_API_KEY missing — populate .env first.');
    process.exit(1);
  }

  const doctors = JSON.parse(fs.readFileSync(DOCTORS_PATH, 'utf-8')) as DoctorRecord[];
  const existing = FORCE ? {} : loadEmbeddings();
  const todo = doctors.filter((d) => !existing[d.id]);

  if (todo.length === 0) {
    console.log(`✓ All ${doctors.length} doctors already embedded (use --force to re-embed).`);
    return;
  }

  console.log(`Embedding ${todo.length}/${doctors.length} doctor(s)…`);
  const embedder = new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: 'gemini-embedding-001',
  });

  // embedDocuments handles batching internally; one round-trip vs N requests.
  const vectors = await embedder.embedDocuments(todo.map(embedText));
  const dim = vectors[0]?.length ?? 0;
  console.log(`  → received ${vectors.length} vectors of dimension ${dim}`);

  const merged = { ...existing };
  todo.forEach((d, i) => {
    merged[d.id] = vectors[i];
  });

  fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(merged) + '\n', 'utf-8');
  console.log(`✓ Wrote ${Object.keys(merged).length} embeddings to ${path.relative(process.cwd(), EMBEDDINGS_PATH)}`);
}

main().catch((err) => {
  console.error('embed-doctors failed:', err);
  process.exit(1);
});

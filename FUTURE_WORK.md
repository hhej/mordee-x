# MorDee+ — Future Work: Adversarial Test Findings

> **Status: future work — NOT a pre-5/30 blocker.** Nothing here is required for the
> 2026-05-30 presentation. This is a "what we'd harden next" record from an adversarial
> sweep of the whole app. The demo path works; these are edges, abuse cases, and polish.

**Method.** Static analysis + `tsc --noEmit` + `pnpm lint` + data-shape checks + **live runtime
probing** of every API route on a running dev server (real Gemini + Neon calls). Date: 2026-05-28.

**Severity legend.** 🔴 High · 🟠 Medium · 🟡 Low · ⚪ Trivial/Info

> ⚠️ Every finding below was **hand-verified**. Three claims from an automated first pass turned out
> to be **false** and are documented in [§9 Non-issues](#9-non-issues--corrected-claims) so nobody
> chases ghosts: secrets are *not* committed to git, error boundaries *do* exist, and the embedding
> dimensions/shapes are *correct* (3072-d throughout).

---

## Summary

| ID | Severity | Area | Finding |
|----|----------|------|---------|
| D1 | 🔴 High | Deploy | No rate limiting/auth on paid-LLM routes (public Vercel URL → quota/cost abuse) |
| A1 | 🟠 Med | CI | `pnpm lint` fails (exit 1) — `setState`-in-effect in `PrintableDoc.tsx` |
| B1 | 🟠 Med | Resilience | `rag.ts` reads the KB at module import — unguarded; a bad file crashes every route that imports it |
| B2 | 🟠 Med | Resilience | `cosineSimilarity` returns `NaN` on dim-mismatch / zero-vector → silent wrong retrieval |
| C1 | 🟠 Med | Abuse | No max length on free-text → 1.5 MB input took **20 s** live; bigger → timeout/cost |
| G3 | 🟠 Med | Perf | ~960 KB demand-forecast JSON statically imported into client bundle |
| B3 | 🟡 Low | Resilience | `checkup.ts` empty-catalog → `topIds[0]` is `undefined` → invalid `program_id` |
| B4 | 🟡 Low | Consistency | `/api/summarize` hard-500s on unknown `doctor_id`; `/api/prescribe` degrades gracefully |
| C2 | 🟡 Low | Validation | `MatchRequestSchema.specialty_hint` is open `z.string()` (response uses a closed enum) |
| C3 | 🟡 Low | Validation | `age` has no max; `bmi` has no bounds → `age:200, bmi:-50` reach the LLM prompt |
| C4 | 🟡 Low | Validation | `/api/chat` accepts `messages:[]` → Gemini 400 surfaced as stream error (no `.min(1)`) |
| H1 | 🟡 Low | Info-leak | Validation errors return the full zod error JSON to the client |
| D2 | 🟡 Low | Headers | No security headers / CSP (defense-in-depth; XSS surface is minimal) |
| F1 | 🟡 Low | State | Double-booking race across two tabs (localStorage isn't transactional) |
| F2 | 🟡 Low | UI | `global-error.tsx` hardcodes `bg-white`/`ring-mint-200` — no dark variant |
| F3 | 🟡 Low | UI | No length cap when rendering LLM output → DOM bloat on a runaway response |
| E1 | ⚪ Info | Secrets | `.env*` correctly gitignored & never committed — precautionary notes only |
| G1 | ⚪ Trivial | Lint | Unused var `SUSPECT` in `scripts/rolelock-smoke.mjs:94` |
| G2 | ⚪ Trivial | Deps | Minor dependency drift (e.g. `@google/genai` 2.4 → 2.6) |

---

## 1. Deploy exposure

### D1 — 🔴 No rate limiting or auth on routes that make paid Gemini calls
**Where:** all of `src/app/api/*` (`triage`, `brief`, `chat`, `match`, `prescribe`, `summarize`, `checkup`).
No `src/middleware.ts`, no limiter, no shared token.
**Why it matters:** the app is live at `mordee-x.vercel.app`. Every route invokes Gemini (and several
embed first). Anyone with the URL can script a loop and drain the API quota / run up cost. This is the
single highest *real-world* adversarial risk. (No login is intentional per plan; rate-limiting is
orthogonal to that.)
**Live evidence:** unauthenticated `POST /api/triage` etc. all returned `200` with no throttling.
**Proposed fix (future):** a Vercel Firewall rate rule (simplest, platform-native), or a tiny
`middleware.ts` per-IP limiter (Upstash Ratelimit), or gate the deployed demo behind a shared
`?key=` / header token you hand graders. Keep local dev unthrottled.

---

## 2. Build / CI correctness

### A1 — 🟠 `pnpm lint` fails (exit 1)
**Where:** `src/components/shared/PrintableDoc.tsx:23`
```ts
useEffect(() => setMounted(true), []);  // react-hooks/set-state-in-effect (React Compiler on)
```
**Why it matters:** `pnpm lint` exits non-zero, so any CI gate on lint is red. `tsc --noEmit` passes clean.
**Proposed fix:** gate the portal mount without a synchronous setState-in-effect — e.g.
`useSyncExternalStore(subscribe, () => true, () => false)` for "is client", or a one-line
`// eslint-disable-next-line react-hooks/set-state-in-effect` with a rationale comment if the mount
flag is intentional. (Also clears the only blocker to making lint a CI check.)

---

## 3. Resilience — the "demo can't break" fallback guarantee

The architecture promises DB-first with automatic JSON fallback so retrieval *never* fails. Two spots
quietly violate that.

### B1 — 🟠 RAG knowledge base is read at module import, unguarded
**Where:** `src/lib/rag.ts:17-18`
```ts
const KB_PATH = path.join(process.cwd(), 'data', 'symptom_kb.json');
const kb: SymptomKbEntry[] = JSON.parse(fs.readFileSync(KB_PATH, 'utf-8')); // top-level, throws on import
```
**Why it matters:** if `symptom_kb.json` is missing/corrupt, the **import itself throws**, taking down
*every* route that imports `rag` (triage, brief, match, checkup) — even when the DB is healthy and the
JSON fallback should never be needed. The sibling `doctor-embeddings.ts:loadFromDisk()` already does this
safely (try/catch → `{}`).
**Proposed fix:** make the read lazy + guarded, mirroring `doctor-embeddings.ts`: load on first `topK`
fallback inside try/catch, default to `[]` (empty KB) on failure. Retrieval then degrades to "no
grounding" instead of a 500.

### B2 — 🟠 `cosineSimilarity` returns `NaN` on dimension mismatch / zero vector
**Where:** `src/lib/rag.ts:20-29`
```ts
for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; normA += a[i]*a[i]; normB += b[i]*b[i]; }
return dot / (Math.sqrt(normA) * Math.sqrt(normB));
```
**Why it matters:** loops `a.length` only — if `b` is shorter, `b[i]` is `undefined` → `NaN`; a zero
vector → `÷0` → `NaN`. `NaN` sorts unpredictably, so retrieval silently returns near-arbitrary entries.
This is the **exact class** of the 768-vs-3072 bug already fixed once (per CLAUDE.md); the guard would
prevent a repeat if any embedding dim ever drifts again.
**Proposed fix:** early-return `0` when `a.length !== b.length` or either norm is `0`. Optionally log once
on mismatch so drift is loud, not silent.

### B3 — 🟡 `checkup.ts` crashes/returns garbage on an empty catalog
**Where:** `src/lib/llm/graphs/checkup.ts:124`
```ts
if (!topIds.includes(recommendation.program_id)) {
  return { recommendation: { ...recommendation, program_id: topIds[0] } }; // topIds[0] === undefined if catalog empty
}
```
**Why it matters:** if `getCheckupPrograms()` ever returns `[]`, `topIds` is empty and the fallback writes
`program_id: undefined`. Low likelihood (catalog is static), but unguarded.
**Proposed fix:** guard `if (topIds.length === 0)` → return a typed "no recommendation" result instead of
indexing `[0]`.

### B4 — 🟡 Inconsistent missing-doctor handling
**Where:** `src/lib/llm/graphs/summarize.ts:~22` (hard throw) vs `prescribe.ts` (graceful fallback).
**Live evidence:**
- `POST /api/summarize {doctor_id:"NOPE"}` → **500** `{"error":"Doctor NOPE not found"}`
- `POST /api/prescribe {doctor_id:"NOPE"}` → **200** (falls back to "General Practice")
**Why it matters:** same bad input, two different outcomes. Summarize 500s where prescribe recovers.
**Proposed fix:** align summarize to prescribe's graceful fallback (default specialty / generic header).

---

## 4. Input validation / abuse surface (`src/lib/llm/schemas.ts`)

> Context: free-text fields are interpolated into LLM prompts. Outputs are **zod-structured** and rendered
> through React (auto-escaped) — **no XSS / code-exec** path exists (no `dangerouslySetInnerHTML`, no
> markdown-to-HTML). So these are **prompt-steering, cost, and data-quality** issues, not injection RCE.

### C1 — 🟠 No maximum length on free-text input
**Where:** `schemas.ts:96` `symptom_text: z.string().min(1)` (no `.max()`); same for transcript content.
**Live evidence:** `POST /api/triage` with a **1.5 MB** `symptom_text` → **200 in 20.06 s**. A larger paste
would cross the 35 s LLM timeout / 45 s route `maxDuration` and waste embedding+token cost; there's no
app-level request-body cap either.
**Proposed fix:** `z.string().min(1).max(4000)` (pick a clinical-sane ceiling) server-side + a `maxLength`
on the patient `<textarea>` in `SymptomChat.tsx`.

### C2 — 🟡 `specialty_hint` accepts arbitrary strings on input
**Where:** `schemas.ts:101` `specialty_hint: z.string()` — but the *response* `SpecialtyHintSchema:13`
is a closed enum.
**Live evidence:** `POST /api/match {specialty_hint:"FAKE_SPECIALTY"}` → accepted, streamed a doctor
(`D011`). Graceful, but unvalidated.
**Proposed fix:** validate the request field with the same `SpecialtyHintSchema` enum.

### C3 — 🟡 Unbounded `age` / `bmi`
**Where:** `schemas.ts:106,143,162` `age: z.number().int().min(0)` (no max); `:166` `bmi` nullable, no bounds.
**Live evidence:** `POST /api/checkup {age:200, bmi:-50}` → **200**; values render straight into the prompt
(`Age: 200`, `BMI: -50.0`). (Note: `age:-1` *is* caught by `.min(0)`.)
**Proposed fix:** `age: z.number().int().min(0).max(120)`, `bmi: z.number().min(5).max(120).nullable()`.

### C4 — 🟡 `/api/chat` accepts an empty `messages` array
**Where:** `schemas.ts:118-129` `messages: z.array(...)` — no `.min(1)`.
**Live evidence:** `POST /api/chat {messages:[]}` → Gemini `400 "contents is not specified"`, surfaced as a
clean SSE `{"type":"error"}` (no crash, but a wasted round-trip).
**Proposed fix:** `.min(1)` on `messages` → return a local 400 before calling Gemini.

### H1 — 🟡 Validation errors leak the full zod error to the client
**Where:** every route's `400` path returns `JSON.stringify(parsed.error.issues)`.
**Live evidence:** responses include full schema internals (field names, enum option lists, paths).
**Why it matters:** minor information disclosure + ugly client payloads.
**Proposed fix:** return a generic `{ error: "Invalid request" }` (log the detail server-side), or a
trimmed `{ field, message }[]`.

---

## 5. Headers

### D2 — 🟡 No security headers / CSP
**Where:** no `headers()` in `next.config.ts`, no middleware. (`/api/chat` & `/api/match` set only
`Cache-Control`.)
**Why it matters:** defense-in-depth — the actual XSS surface is minimal (React-escaped output), so this
is low priority.
**Proposed fix:** add a `headers()` block: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy`.

---

## 6. Frontend robustness

### F1 — 🟡 Double-booking race across tabs
**Where:** `src/stores/store-appointments.ts` (`isSlotTaken` + localStorage persist).
**Why it matters:** localStorage isn't transactional — two tabs can both pass `isSlotTaken` and book the
same slot. Low impact (single-user demo), but real.
**Proposed fix:** re-check `isSlotTaken` inside the commit, or document as a known demo limitation.

### F2 — 🟡 `global-error.tsx` isn't dark-mode aware
**Where:** `src/app/global-error.tsx:16-17` — `bg-white` (×2) and `ring-mint-200/60`, no `dark:` variants.
**Why it matters:** only shows on a catastrophic app crash, but would be jarring in dark mode. Cosmetic.
**Proposed fix:** add `dark:bg-slate-900` / `dark:ring-mint-500/30` (matches `error.tsx`, which is already
dark-aware).

### F3 — 🟡 No length cap on rendered LLM output
**Where:** summary / certificate / chat renderers.
**Why it matters:** a runaway model response renders in full → DOM bloat. Low.
**Proposed fix:** clamp/truncate display strings (e.g. certificate text) to a sane max with a "show more".

---

## 7. Performance

### G3 — 🟠 ~960 KB ML JSON statically imported into the client bundle
**Where:** `src/lib/data.ts` does `import demandData from '@/data/ml/demand_forecast_7d.json'` (a **static TS
import**, per its own comment "ML JSONs are bundled as TS imports (not `fs.readFileSync`)"). `data.ts` is
imported by **many `'use client'` components** — `availability.ts → getDemandForDoctor` (used in patient
scheduling UI), `DemandForecastCard`, the doctor/patient pages, etc.
**Why it matters:** static JSON imports aren't tree-shaken per-key, so the ~960 KB demand forecast (+
`patient_segments.json`) is very likely shipped in the patient/doctor **client** First-Load JS, not just
server-side.
**Verify:** `pnpm build` and read the First Load JS for `/patient` and `/doctor`.
**Proposed fix:** access demand server-side only — it's already exposed via `GET /api/predict?type=demand`;
have client scheduling fetch it instead of importing the JSON. Or split `data.ts` so client code imports a
demand-free module.

---

## 8. Housekeeping

- **G1 — ⚪** Unused var `SUSPECT` warning, `scripts/rolelock-smoke.mjs:94`.
- **G2 — ⚪** Minor dependency drift (`@google/genai` 2.4 → 2.6, `@types/node`, etc.). No known criticals.
- **E1 — ⚪ (precautionary)** `.env` / `.env.local` are correctly gitignored and were **never committed**
  (verified via `git ls-files` + full history). They hold *live* keys in the working tree (normal for local
  dev). Action items are precautionary only: ensure keys are set as **Vercel env vars** (not relying on the
  local file at deploy), and rotate **only** if the working tree was ever screen-shared/zipped to a third
  party.

---

## Appendix — Live probe results

Run against the dev server on `:3000` (real Gemini + Neon). "Observed" is the actual response.

| # | Probe | Observed | Finding |
|---|-------|----------|---------|
| 1 | `POST /api/triage` 1.5 MB `symptom_text` | **200 in 20.06 s** | C1 ✔ |
| 2 | `POST /api/triage` malformed / empty JSON | **400** (zod "expected object") | OK ✔ |
| 3 | `POST /api/brief` `{}` / missing `triage` | **400** (zod) | OK ✔ (H1) |
| 4a | `POST /api/match` `specialty_hint:"ER"` | `{"type":"done","data":{"total":0}}` (no LLM) | by design ✔ |
| 4b | `POST /api/match` `specialty_hint:"FAKE_SPECIALTY"` | **accepted**, streamed `D011` | C2 ✔ |
| 5a | `POST /api/summarize` `doctor_id:"NOPE"` | **500** `Doctor NOPE not found` | B4 ✔ |
| 5b | `POST /api/prescribe` `doctor_id:"NOPE"` | **200** (General Practice fallback) | B4 ✔ |
| 6 | `GET /api/predict` `type=foo` / `id=BOGUS` / no id / `id=` | **400 / 404 / 400 / 400** | OK ✔ |
| 7 | `POST /api/checkup` `age:-1` then `age:200, bmi:-50` | **400** (age<0) then **200** | C3 ✔ |
| 8 | `POST /api/chat` `messages:[]` | SSE `{"type":"error"}` (Gemini 400) | C4 ✔ |
| 9 | `POST /api/triage` red-keyword (chest pain TH) | **200 in 0.009 s**, `triage:"red"`, LLM bypassed | by design ✔ |
| 10 | SSE abort mid-stream (`/api/match`, 1 s) | client disconnects cleanly; **no** server errors in log | OK ✔ |

---

## 9. Non-issues / corrected claims

Documented so future readers don't re-investigate things that are actually fine:

- ✅ **Secrets are NOT committed to git.** `git ls-files` shows only `.env.local.example`; full-history
  search finds no `.env`/`.env.local` commit. They are correctly gitignored. (An automated first pass
  wrongly flagged this as CRITICAL.)
- ✅ **Error boundaries exist.** `src/app/error.tsx` (route subtree) + `src/app/global-error.tsx` (root). A
  component render crash falls to the route boundary, not a blank page. Component-level boundaries are a
  *nice-to-have*, not a gap.
- ✅ **Embedding dimensions/shapes are correct.** `symptom_kb.json` = 3072-d (50 entries);
  `doctors_embeddings.json` = `{ "D001": number[3072] }`, matching the `Record<string, number[]>` loader and
  the `vector(3072)` columns in `seed-neon.mjs`. The documented 3072-d invariant holds.
- ✅ **No SQL injection.** `db.ts` uses Neon parameterized template literals; the one string-built vector
  (`dbTopKSymptoms`) is composed only from a numeric array and is `::vector`-cast (pgvector rejects bad
  dims; errors fall back to JSON).
- ✅ **No XSS path.** All LLM/user text renders through React JSX (escaped); no `dangerouslySetInnerHTML`,
  no markdown-to-HTML.
- ✅ **SSE abort is clean** (probe 10) — no unhandled rejections after client disconnect.
- ✅ **`next.config.ts` API tunnel** (`LOCAL_API_TUNNEL_URL`) is an opt-in dev-only rewrite; inert unless the
  env var is set. Not a production risk.

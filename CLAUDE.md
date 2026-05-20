# MorDee+ — Claude orientation

**What this is:** Thai telemedicine demo. Single Next.js app, two-sided (patient AI triage + doctor dashboard with ML). Built for two academic rubrics (MADT6004 + MADT7104), presented **2026-05-30**.

**Where we are:** Phase 1 (scaffold + design system) complete on 2026-05-20, committed at `1830b72`. Next is Phase 2 (ML notebooks) which the user authors in Jupyter — **not Claude work**. Phase 3+ resumes Claude implementation.

---

## The plan is locked

Architecture, tech stack, file structure, design system, and LLM prompts are pre-decided in two docs at the project root. **Read by section, not whole file** — they total ~63KB.

**`Mordee_Plus_VibeCoding_Plan.md`** — sections §0–§17:
- `§0` TL;DR · `§3` Tech stack · `§4` File tree
- `§5` Design system · `§6` Locked mock data (15 doctors, hospitals, demo scenarios)
- `§7` ML notebooks spec · `§8` API routes spec
- `§9` Doctor page · `§10` Patient page
- `§12` Phase calendar · `§13` Demo script · `§16` Pitfalls

**`Mordee_Plus_LLM_Prompts.md`** — 7 system prompts (§1–§7). Use verbatim.

**Do not propose architecture changes.** If a different framework, vector DB, auth lib, or ML approach seems "better" — don't suggest it. The user will say no (per plan §0). Stick to the plan.

---

## Hard rules (plan §16)

- **No database.** All data in `src/data/*.json`. Demo persistence via Zustand stores.
- **No live ML.** Notebooks export to `data/ml/*.json`; API routes look up by scenario ID.
- **No Python sidecar in production.** ML stays in Jupyter.
- **No external vector DB.** RAG = pre-embedded vectors in `data/symptom_kb.json` + manual cosine in `lib/rag.ts`.
- **No auth, no login screens.**
- **No navigation between flows.** Each role page is one route; everything else is modal + scroll.
- **Don't regenerate the 15 doctor names** (plan §6) — copy verbatim.
- **Don't ad-lib LLM prompts** — copy from `Mordee_Plus_LLM_Prompts.md` verbatim. Use `zod`/`responseSchema` for structured outputs.
- Streaming via **Vercel AI SDK** only.

---

## Design system (plan §5)

- **Surface:** every panel uses `<GlassCard>` from `src/components/shared/GlassCard.tsx`.
- **Color:** mint green (`mint-50` → `mint-800` tokens in `globals.css`). Triage semantic: `triage-green | triage-yellow | triage-red`.
- **Font:** Sarabun (Thai + Latin), Inter fallback. Loaded in `src/app/layout.tsx`.
- **Layout:** `max-w-6xl mx-auto`, `px-6 py-10 md:px-12 md:py-16`, `gap-6 md:gap-8`, `rounded-2xl` for cards.
- **No dark mode.** Explicitly out of scope.
- **Glass effect:** `backdrop-filter: blur(20px) saturate(180%)`. Test Safari during Phase 6 polish.
- **Landing layout:** patient-hero asymmetric (2:1 grid, patient card wider).

---

## Language

**Thai-first, English peppered.** No i18n library — never propose `next-intl` or `react-i18next`.
- UI labels in Thai
- English appears where natural: doctor English names, ICD-10 codes, specialty hints, short subtitles for grader accessibility
- No locale switcher in UI

---

## Phase calendar

| # | Dates | Scope | Author |
|---|---|---|---|
| 1 | May 10–11 | Scaffold + design system | ✅ Claude (done) |
| 2 | May 12–16 | ML notebooks (no-show + demand forecast) + symptom KB seed | **User in Jupyter** |
| 3 | May 17–19 | 5 API routes + RAG + LLM prompts wiring | Claude |
| 4 | May 20–22 | Doctor page | Claude |
| 5 | May 23–26 | Patient page | Claude |
| 6 | May 27–29 | Polish + demo prep | Claude + user |
| — | May 30 | Presentation | — |

Plan was written assuming today = May 10. Real today may differ — check `git log` and ask the user what phase they're on before assuming.

---

## File map (post-Phase 1)

```
src/
├── app/
│   ├── page.tsx            # landing (patient-hero asymmetric)
│   ├── layout.tsx          # fonts, metadata
│   ├── globals.css         # mint tokens + .glass + body gradient
│   ├── patient/page.tsx    # skeleton (Phase 5)
│   └── doctor/page.tsx     # skeleton (Phase 4)
├── components/
│   ├── shared/{GlassCard,RoleHeader,EmptyState}.tsx
│   ├── patient/            # empty (Phase 5)
│   ├── doctor/             # empty (Phase 4)
│   └── ui/                 # shadcn primitives (button, card, dialog, input, badge, avatar, tabs)
├── lib/utils.ts            # cn() helper
└── data/                   # empty (Phase 3 seeds JSON)
notebooks/                  # empty (Phase 2)
```

Phase 1 plan archived at `~/.claude/plans/staged-questing-dolphin.md`.

---

## Tech stack (locked)

- Next.js **16.2.6** + React 19 + TypeScript 5 (plan says 15.x; 16 shipped since plan was written, fully compatible)
- Tailwind CSS 4 (CSS-first `@theme` in `globals.css`)
- shadcn/ui — **pinned to 4.6.0** (4.7.0 init has a bug; use `pnpm dlx shadcn@4.6.0 add ...`)
- **pnpm** 11 (not npm/yarn)
- `@google/genai` (Gemini SDK) + `ai` (Vercel AI SDK) for streaming
- `zod`, `zustand`, `framer-motion`, `lucide-react`, `recharts`, `react-markdown`
- ML in Jupyter: XGBoost, Prophet, LightGBM, SHAP — output JSON only

---

## Commands

- `pnpm dev` — Next dev server on :3000 (Turbopack)
- `pnpm build` — production build; use to type-check
- `pnpm lint` — ESLint
- `pnpm dlx shadcn@4.6.0 add <component>` — add more shadcn primitives

`.env.local` (gitignored) needs `GOOGLE_GENAI_API_KEY=...` for any LLM call once Phase 3 starts. Template: `.env.local.example`.

---

## Working style

- User prefers detailed interview before non-trivial implementation work (typically 3–7 clarifying questions, sometimes in multiple rounds). Use plan mode + `AskUserQuestion` with previews for visual choices.
- When asked "recommend me the best practice one," give one pick with brief rationale — don't over-explain trade-offs.
- When uncertain about a decision affecting later phases, ask before committing.
- Bilingual at heart — feel free to label UI work in TH + EN when describing it back.

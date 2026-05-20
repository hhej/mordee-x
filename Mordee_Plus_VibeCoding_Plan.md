# MorDee+ v3.6 — Claude Code Vibe-Coding Plan
**Solo build · 3 weeks (10–30 May 2026) · Next.js 15 + Tailwind + Gemini-2.5-flash + Jupyter ML notebooks**

> **How to use this doc with Claude Code:**
> 1. Drop this file (and `Mordee_Plus_LLM_Prompts.md`) into the project root.
> 2. Tell Claude Code "Read VibeCoding_Plan.md and implement Phase 1." Repeat for each phase.
> 3. The plan is locked — if Claude Code suggests architectural changes (different framework, different ML approach), say no. Stick to the plan.

---

## §0. TL;DR

You're building a **two-sided telemedicine demo** as a single Next.js 15 app. The patient gets a 🟢🟡🔴 triage chatbot powered by RAG + LLM; the doctor gets a dashboard with two ML models (no-show prediction + daily demand forecast). Both sides share a chat-summary engine that produces a medical certificate + self-care plan.

**ML is trained offline in Jupyter notebooks**; predictions for ~20 demo scenarios are exported to JSON and served by Next.js API routes. **No Python sidecar in production.**

**Theme:** minimal white + green + glassmorphism · single page per role · all interactions stay on that page.

---

## §1. Project context

### What we're building
- `/` landing page → role selector (👤 Patient or ⚕️ Doctor)
- `/patient` — single page with everything: symptom chat → triage → doctor list → booking → mock payment → mock consult → summary → follow-up
- `/doctor` — single page with everything: demand forecast dashboard + appointment queue with no-show risk + mock consult chat → AI-generated medical certificate + self-care plan

### Why it scores
- **MADT6004 (30 pts):** Two ML models with **full pipeline notebooks** (EDA → assumptions → feature engineering → variance/correlation pruning by shallow-tree importance → model training → tuning → evaluation → business interpretation). Hits weeks 8 (time-series) + 9 (classification). Target: **28–30/30** = A/A+
- **MADT7104 (100 pts):** Two-sided platform, killer-feature symptom triage with RAG, glassmorphism polished UX, LLM at multiple touchpoints. Target: **85–92** = A/A+

### What 100/100 looks like (and why we won't hit it)
The rubric reserves 10/10 for *genuinely novel* work. No telemedicine project will be unprecedented to the grader. **Aim for A+ (90+) — that's the practical ceiling.**

---

## §2. Architecture overview

```
                  ┌─────────────────────────────────┐
                  │  Next.js 15 App Router          │
                  │  (single deployment)            │
                  └─────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
      /patient page     /doctor page       API routes
      (client comp)     (client comp)
                                    │
                ┌───────────────────┼────────────────────────┐
                ▼                   ▼                        ▼
        /api/chat          /api/triage              /api/summarize
        /api/predict       /api/match               /api/followup
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
  Gemini API           data/symptom_kb.json           data/ml/*.json
  (LLM streaming)     (RAG with cosine)             (cached predictions)
```

**Key rules:**
- **No database.** All data lives in `data/*.json` files. Read at request time. Demo-only persistence is in Zustand store (page lifetime).
- **No live ML inference.** Notebooks output `data/ml/{model}_predictions.json` keyed by demo scenario ID. API routes look up by ID.
- **No external vector DB.** Symptom KB has pre-embedded vectors in `data/symptom_kb.json`; manual cosine in `lib/rag.ts`.
- **Streaming via Vercel AI SDK** — chat endpoints stream tokens to the client.

---

## §3. Tech stack (locked)

```json
{
  "framework": "next@15.x with App Router",
  "react": "react@19",
  "language": "TypeScript 5",
  "styling": "tailwindcss@4 + @tailwindcss/typography",
  "ui-primitives": "shadcn/ui (copy-paste)",
  "icons": "lucide-react",
  "animations": "framer-motion",
  "charts": "recharts",
  "state": "zustand@4",
  "llm-sdk": "@google/genai (official Gemini SDK) + ai (Vercel AI SDK for streaming)",
  "validation": "zod",
  "fonts": "Sarabun (Thai) + Inter (Latin) via next/font",
  "ml-runtime": "Jupyter Python — XGBoost, Prophet, LightGBM, SHAP — predictions exported to JSON"
}
```

### One-shot install (Phase 1)
```bash
pnpm create next-app@latest mordee-plus --typescript --tailwind --app --src-dir --eslint
cd mordee-plus
pnpm add @google/genai ai zod zustand framer-motion lucide-react recharts react-markdown
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card dialog input badge avatar tabs
```

### `.env.local`
```
GOOGLE_GENAI_API_KEY=your_key_here
```

---

## §4. File structure (complete tree)

```
mordee-plus/
├── README.md
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── .env.local.example
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # fonts, globals, providers
│   │   ├── page.tsx                    # landing + role selector
│   │   ├── globals.css                 # tailwind + glass tokens
│   │   ├── patient/
│   │   │   └── page.tsx                # ENTIRE patient experience
│   │   ├── doctor/
│   │   │   └── page.tsx                # ENTIRE doctor experience
│   │   └── api/
│   │       ├── chat/route.ts           # streaming chat (patient↔mock-doctor)
│   │       ├── triage/route.ts         # symptom → 🟢🟡🔴 + RAG
│   │       ├── summarize/route.ts      # transcript → cert + self-care
│   │       ├── match/route.ts          # symptom → doctor list
│   │       ├── followup/route.ts       # decide if follow-up needed
│   │       └── predict/route.ts        # GET ML predictions from JSON
│   ├── components/
│   │   ├── ui/                         # shadcn-installed
│   │   ├── shared/
│   │   │   ├── GlassCard.tsx           # the foundational glass surface
│   │   │   ├── RoleHeader.tsx
│   │   │   ├── LoadingDots.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── patient/
│   │   │   ├── SymptomChat.tsx         # the killer feature chat
│   │   │   ├── TriageResult.tsx        # 🟢🟡🔴 panel + sources
│   │   │   ├── HospitalList.tsx        # shown on RED
│   │   │   ├── DoctorList.tsx          # grid of 15 doctor cards
│   │   │   ├── DoctorCard.tsx
│   │   │   ├── BookingDialog.tsx       # slot picker
│   │   │   ├── MockPayment.tsx         # one-click pay
│   │   │   ├── ConsultChat.tsx         # mock chat with doctor
│   │   │   ├── ConsultSummary.tsx      # cert + self-care
│   │   │   └── FollowUpPrompt.tsx
│   │   └── doctor/
│   │       ├── DemandForecastChart.tsx # 7-day forecast w/ recommended slots
│   │       ├── DemandHeatmap.tsx       # hour × day grid
│   │       ├── AppointmentList.tsx     # patients today with no-show badges
│   │       ├── AppointmentCard.tsx
│   │       ├── PatientBrief.tsx        # AI brief panel
│   │       ├── ConsultChat.tsx         # mock chat with patient
│   │       └── ConsultSummary.tsx      # same as patient side
│   ├── lib/
│   │   ├── gemini.ts                   # createGeminiClient + helpers
│   │   ├── rag.ts                      # cosine sim over symptom_kb
│   │   ├── ml.ts                       # readPredictionsById helpers
│   │   ├── types.ts                    # shared TypeScript types
│   │   ├── store-patient.ts            # Zustand store for patient page
│   │   ├── store-doctor.ts             # Zustand store for doctor page
│   │   └── constants.ts                # colors, thresholds, hospital list
│   └── data/
│       ├── doctors.json                # 15 doctors (see §6)
│       ├── symptom_kb.json             # RAG KB with embedded vectors
│       ├── hospitals.json              # for RED triage
│       ├── demo_scenarios.json         # canned demo input data
│       └── ml/
│           ├── no_show_predictions.json
│           ├── demand_forecast_7d.json
│           └── model_metrics.json      # for slides
├── notebooks/
│   ├── 01_no_show_full_pipeline.ipynb
│   ├── 02_demand_forecast_full_pipeline.ipynb
│   ├── requirements.txt
│   └── data/
│       └── KaggleV2-May-2016.csv       # Brazil dataset
└── public/
    ├── doctors/                        # avatar PNGs (use ui-avatars.com URLs ok)
    ├── logo.svg
    └── og.png
```

---

## §5. Design system

### Color tokens (Tailwind 4 — `app/globals.css`)

```css
@import "tailwindcss";

@theme {
  /* Base palette */
  --color-mint-50:  #f0fdf4;
  --color-mint-100: #dcfce7;
  --color-mint-200: #bbf7d0;
  --color-mint-300: #86efac;
  --color-mint-400: #4ade80;
  --color-mint-500: #22c55e;  /* primary brand */
  --color-mint-600: #16a34a;
  --color-mint-700: #15803d;
  --color-mint-800: #166534;

  /* Triage semantic colors */
  --color-triage-green:  #10b981;
  --color-triage-yellow: #f59e0b;
  --color-triage-red:    #ef4444;

  /* Neutrals */
  --color-ink:    #0f172a;     /* primary text */
  --color-muted:  #64748b;     /* secondary text */
  --color-line:   #e2e8f0;     /* dividers */
  --color-bg:     #f8fafc;     /* page background */

  /* Fonts */
  --font-sans: 'Sarabun', 'Inter', system-ui, sans-serif;
  --font-display: 'Sarabun', 'Inter', system-ui, sans-serif;
}

/* Glass surface */
.glass {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
}

/* Subtle mesh background — put behind the whole app */
body {
  background:
    radial-gradient(at 80% 20%, rgba(34, 197, 94, 0.12) 0px, transparent 50%),
    radial-gradient(at 20% 80%, rgba(110, 231, 183, 0.15) 0px, transparent 50%),
    linear-gradient(180deg, #f8fafc 0%, #f0fdf4 100%);
  min-height: 100vh;
}
```

### Typography

- **Display / page title:** Sarabun 700, 36–48px
- **Heading:** Sarabun 600, 22–28px
- **Body:** Sarabun 400, 15–16px
- **Mono / code:** "JetBrains Mono", monospace, 13–14px

### Component primitive: `GlassCard.tsx`

```tsx
// src/components/shared/GlassCard.tsx
import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 transition-all hover:shadow-lg",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
```

Every panel in the app uses `GlassCard` as the surface. Don't break this.

### Layout rules

- Page padding: `px-6 py-10 md:px-12 md:py-16`
- Max content width: `max-w-6xl mx-auto`
- Grid gaps: `gap-6 md:gap-8`
- Border radius: `rounded-2xl` for cards, `rounded-full` for pills/avatars
- Shadows: subtle only — `shadow-sm` or `shadow-md`. No hard drop shadows.

---

## §6. Mock data (the 15 doctors and the demo scenarios)

### `data/doctors.json` — 15 doctors

Save this verbatim. Don't let Claude Code regenerate names.

```json
[
  {"id":"D001","name":"นพ. ธนพล ใจกล้า","name_en":"Dr. Tanapol Jaikla","specialty":"General Practice","specialty_th":"เวชศาสตร์ทั่วไป","gender":"M","years":12,"rating":4.7,"price":350,"langs":["th","en"],"avatar":"https://i.pravatar.cc/150?img=11"},
  {"id":"D002","name":"พญ. สุภาพร ศรีวิไล","name_en":"Dr. Suphaporn Sriwilai","specialty":"Internal Medicine","specialty_th":"อายุรกรรม","gender":"F","years":15,"rating":4.9,"price":500,"langs":["th"],"avatar":"https://i.pravatar.cc/150?img=47"},
  {"id":"D003","name":"นพ. วรเชษฐ์ พงศ์พิทักษ์","name_en":"Dr. Worachet Pongpitak","specialty":"Cardiology","specialty_th":"โรคหัวใจ","gender":"M","years":20,"rating":4.8,"price":900,"langs":["th","en"],"avatar":"https://i.pravatar.cc/150?img=14"},
  {"id":"D004","name":"พญ. ปิยะดา แสงทอง","name_en":"Dr. Piyada Sangthong","specialty":"OB-GYN","specialty_th":"สูตินรีเวช","gender":"F","years":11,"rating":4.9,"price":700,"langs":["th","en"],"avatar":"https://i.pravatar.cc/150?img=44"},
  {"id":"D005","name":"นพ. ณัฐกฤษฎ์ บุญมาก","name_en":"Dr. Natthakrit Boonmak","specialty":"Pediatrics","specialty_th":"กุมารเวช","gender":"M","years":8,"rating":4.8,"price":600,"langs":["th"],"avatar":"https://i.pravatar.cc/150?img=15"},
  {"id":"D006","name":"พญ. รัตนาพร สิริวัฒน์","name_en":"Dr. Ratanaporn Siriwat","specialty":"Dermatology","specialty_th":"ผิวหนัง","gender":"F","years":10,"rating":4.7,"price":650,"langs":["th","en"],"avatar":"https://i.pravatar.cc/150?img=48"},
  {"id":"D007","name":"นพ. กิตติพงษ์ สุวรรณคีรี","name_en":"Dr. Kittipong Suwannakiri","specialty":"Orthopedics","specialty_th":"กระดูกและข้อ","gender":"M","years":18,"rating":4.6,"price":800,"langs":["th"],"avatar":"https://i.pravatar.cc/150?img=12"},
  {"id":"D008","name":"พญ. ธัญลักษณ์ พิทยานนท์","name_en":"Dr. Tanyaluck Pittayanon","specialty":"Psychiatry","specialty_th":"จิตเวช","gender":"F","years":9,"rating":4.9,"price":1000,"langs":["th","en"],"avatar":"https://i.pravatar.cc/150?img=45"},
  {"id":"D009","name":"นพ. ชนนพัฒน์ เกียรติศักดิ์","name_en":"Dr. Chananaphat Kiattisak","specialty":"Gastroenterology","specialty_th":"ระบบทางเดินอาหาร","gender":"M","years":14,"rating":4.8,"price":750,"langs":["th"],"avatar":"https://i.pravatar.cc/150?img=13"},
  {"id":"D010","name":"พญ. นรินทร์ แก้วประภา","name_en":"Dr. Narin Kaewprapha","specialty":"Pulmonology","specialty_th":"ระบบทางเดินหายใจ","gender":"F","years":16,"rating":4.7,"price":750,"langs":["th","en"],"avatar":"https://i.pravatar.cc/150?img=49"},
  {"id":"D011","name":"นพ. ภาณุพงศ์ จันทร์โอภาส","name_en":"Dr. Panupong Chanopas","specialty":"Neurology","specialty_th":"ระบบประสาท","gender":"M","years":17,"rating":4.8,"price":850,"langs":["th","en"],"avatar":"https://i.pravatar.cc/150?img=16"},
  {"id":"D012","name":"พญ. อรพินท์ บุญพิทักษ์","name_en":"Dr. Orapin Boonpitak","specialty":"Endocrinology","specialty_th":"ต่อมไร้ท่อ","gender":"F","years":13,"rating":4.7,"price":750,"langs":["th"],"avatar":"https://i.pravatar.cc/150?img=46"},
  {"id":"D013","name":"นพ. ปรเมศวร์ ทองคำสุข","name_en":"Dr. Poramet Thongkhamsuk","specialty":"ENT","specialty_th":"หู คอ จมูก","gender":"M","years":7,"rating":4.6,"price":600,"langs":["th"],"avatar":"https://i.pravatar.cc/150?img=17"},
  {"id":"D014","name":"พญ. กัญญารัตน์ วัฒนะ","name_en":"Dr. Kanyarat Wattana","specialty":"Allergy & Immunology","specialty_th":"ภูมิแพ้","gender":"F","years":10,"rating":4.8,"price":700,"langs":["th","en"],"avatar":"https://i.pravatar.cc/150?img=43"},
  {"id":"D015","name":"นพ. ศุภชัย เลิศมงคล","name_en":"Dr. Suphachai Lertmongkol","specialty":"Urology","specialty_th":"ระบบทางเดินปัสสาวะ","gender":"M","years":19,"rating":4.7,"price":850,"langs":["th"],"avatar":"https://i.pravatar.cc/150?img=18"}
]
```

### `data/hospitals.json` — for the RED triage path

```json
[
  {"name":"โรงพยาบาลรามาธิบดี","name_en":"Ramathibodi Hospital","phone":"02-201-1000","emergency":"1669"},
  {"name":"โรงพยาบาลศิริราช","name_en":"Siriraj Hospital","phone":"02-419-7000","emergency":"1669"},
  {"name":"โรงพยาบาลจุฬาลงกรณ์","name_en":"Chulalongkorn Hospital","phone":"02-256-4000","emergency":"1669"},
  {"name":"โรงพยาบาลบำรุงราษฎร์","name_en":"Bumrungrad Hospital","phone":"02-066-8888","emergency":"1669"},
  {"name":"โรงพยาบาลกรุงเทพ","name_en":"Bangkok Hospital","phone":"1719","emergency":"1669"}
]
```

### `data/symptom_kb.json` — RAG knowledge base (scaffold; Phase 2 will populate)

The Phase-2 LLM-curation step builds ~50 entries with this shape:

```json
[
  {
    "id": "S001",
    "title": "Chest pain with shortness of breath",
    "title_th": "เจ็บหน้าอกร่วมกับหายใจลำบาก",
    "severity": "red",
    "guidance_th": "หยุดกิจกรรมทุกอย่าง โทร 1669 หรือไปโรงพยาบาลใกล้บ้านทันที อาจเป็นสัญญาณของภาวะกล้ามเนื้อหัวใจขาดเลือดเฉียบพลัน",
    "guidance_en": "Stop all activity. Call 1669 or go to the nearest ER immediately. Could indicate acute coronary syndrome.",
    "specialty_hint": "Cardiology",
    "source": "Thai Heart Association · Acute Chest Pain Guidelines 2024",
    "embedding": [/* 768 floats from gemini-embedding-001 */]
  }
]
```

(Embedding vectors are computed in `notebooks/03_seed_symptom_kb.ipynb` and saved into this file.)

### `data/demo_scenarios.json` — canned demos for live presentation

```json
{
  "patient_demos": [
    {
      "id": "PD01",
      "label": "Routine: gastroenteritis",
      "symptom_input": "ปวดท้องน้อย ท้องเสีย 2 วัน ไข้ต่ำ ๆ คลื่นไส้",
      "expected_triage": "yellow",
      "expected_specialty": "Internal Medicine"
    },
    {
      "id": "PD02",
      "label": "Critical: chest pain",
      "symptom_input": "เจ็บหน้าอกร้าวไปแขนซ้าย หายใจลำบาก เหงื่อแตก 30 นาที",
      "expected_triage": "red",
      "expected_specialty": "ER"
    },
    {
      "id": "PD03",
      "label": "Green: mild headache",
      "symptom_input": "ปวดหัวเล็กน้อย พักผ่อนน้อย เครียดจากงาน",
      "expected_triage": "green",
      "expected_specialty": "General Practice"
    }
  ],
  "doctor_demo": {
    "id": "DD01",
    "doctor_id": "D001",
    "today_appointments": [
      {"appt_id":"A001","patient":"นางสาว มะลิ","time":"10:00","symptom":"ไอเรื้อรัง","prediction_id":"NS001"},
      {"appt_id":"A002","patient":"นาย สมชาย","time":"11:30","symptom":"ปวดเข่า","prediction_id":"NS002"},
      {"appt_id":"A003","patient":"นาง วันดี","time":"14:00","symptom":"ตรวจสุขภาพ","prediction_id":"NS003"}
    ]
  }
}
```

### `data/ml/no_show_predictions.json` — output of notebook 01

```json
{
  "NS001": {"p_no_show": 0.12, "risk_tier": "LOW", "top_shap": [{"feature":"sms_confirmed","value":1,"shap":-0.18}, {"feature":"lead_time_hrs","value":24,"shap":-0.09}], "recommended_action":"single_reminder"},
  "NS002": {"p_no_show": 0.47, "risk_tier": "MED", "top_shap": [{"feature":"prior_no_show","value":1,"shap":0.21}], "recommended_action":"escalated_reminder"},
  "NS003": {"p_no_show": 0.78, "risk_tier": "HIGH", "top_shap": [{"feature":"prior_no_show","value":2,"shap":0.34}, {"feature":"sms_confirmed","value":0,"shap":0.14}], "recommended_action":"require_confirmation"}
}
```

### `data/ml/demand_forecast_7d.json` — output of notebook 02

```json
{
  "DD01": {
    "doctor_id": "D001",
    "horizon_days": 7,
    "by_hour": [
      {"datetime":"2026-05-26T09:00","expected_bookings":2.1,"ci_low":1.4,"ci_high":2.9},
      {"datetime":"2026-05-26T10:00","expected_bookings":3.4,"ci_low":2.6,"ci_high":4.3}
      /* ... 7 × 24 = 168 hours */
    ],
    "recommended_online_slots": [
      {"start":"2026-05-26T19:00","end":"2026-05-26T21:00","predicted_load":"HIGH","expected_consults":7},
      {"start":"2026-05-28T14:00","end":"2026-05-28T16:00","predicted_load":"HIGH","expected_consults":6}
    ],
    "expected_revenue_uplift_pct": 18,
    "winning_model": "prophet",
    "model_mae": 1.42
  }
}
```

---

## §7. ML notebooks specification

> **CRITICAL:** Both notebooks must be done in Week 1 before app coding starts. The MADT6004 score lives entirely in these notebooks. Take them seriously.

### Notebook 01 — No-show Prediction (`notebooks/01_no_show_full_pipeline.ipynb`)

**Mandatory sections (in this order):**

1. **Project context** — 1 markdown cell stating the business problem (Thai no-show stats, hypothesis, target metric)
2. **Imports + data load** — Brazil Kaggle dataset
3. **EDA**
   - `df.info()`, `df.describe()`, missing values heatmap (seaborn)
   - Target distribution (class imbalance plot)
   - Distribution per feature (histograms grid)
   - Group comparison: `no_show` rate by `gender`, `age_bin`, `day_of_week`, `sms_received` (with chi-square or t-test p-values printed)
   - Correlation heatmap of numeric features
4. **Assumptions** — markdown cell listing 4–6 assumptions (e.g., "Brazilian patient behavior is a reasonable proxy for Thai", "the dataset is a representative sample", "no_show label is correct")
5. **Feature engineering**
   - `lead_time_hours` = `AppointmentDay - ScheduledDay`
   - `day_of_week`, `hour_of_day` extracted
   - `prior_no_show_count` per `PatientId` (rolling)
   - `prior_bookings_count` per `PatientId`
   - `age_bin` (0–18, 19–35, 36–55, 56+)
   - One-hot encode `Neighbourhood` (then drop low-count ones)
   - Synthetic `distance_km` from Neighbourhood + Gaussian noise
6. **Feature selection (the rigorous version)**
   - Step A: drop zero-variance features (`VarianceThreshold(0.0)`)
   - Step B: train **shallow XGBoost** (`max_depth=3, n_estimators=50`) to get baseline feature importances
   - Step C: compute pairwise correlations between features
   - Step D: for each pair with `|corr| > 0.85`, drop the lower-importance one
   - Step E: drop features with importance < 1% AND `|corr| > 0.7` to any kept feature
   - Print before/after feature lists with counts
7. **Model training**
   - Train/val/test split 70/15/15 stratified
   - **Logistic Regression** baseline (`class_weight='balanced'`)
   - **XGBoost** champion (with `scale_pos_weight` for imbalance)
8. **Hyperparameter tuning**
   - `GridSearchCV` or `optuna` on XGBoost (`max_depth ∈ [3,5,7]`, `n_estimators ∈ [100,300,500]`, `learning_rate ∈ [0.05,0.1]`)
   - 5-fold stratified CV
   - Print best params + CV score
9. **Evaluation**
   - ROC-AUC + ROC curve plot
   - Precision-recall curve
   - **Calibration plot** (Brier score)
   - Confusion matrix at default and at tuned threshold
   - Per-segment performance (by gender, age bin)
10. **SHAP interpretation**
    - `TreeExplainer` global summary plot
    - 3 local force plots for example patients
11. **Simulated week (the killer chart)**
    - Compare 3 reminder policies on held-out test set:
      - (a) no reminders
      - (b) blanket SMS to everyone
      - (c) ML-driven cadence (high risk = 3 reminders, low = 1)
    - Plot expected slot utilization for each policy
12. **Business summary**
    - 1 markdown table: ROI per intervention, recommended threshold, model limitations
13. **Export predictions** — final cell writes `data/ml/no_show_predictions.json` keyed by `prediction_id` for the demo scenarios

### Notebook 02 — Demand Forecast (`notebooks/02_demand_forecast_full_pipeline.ipynb`)

**Mandatory sections:**

1. **Project context** — daily/hourly demand forecasting for doctor scheduling
2. **Imports + data load + aggregate** — same Brazil dataset rolled up to hourly counts citywide (or by top-5 neighborhoods)
3. **EDA**
   - Time-series plot (full history)
   - Decomposition (statsmodels `seasonal_decompose`) — trend + weekly seasonality + residual
   - ACF + PACF plots
   - Day-of-week boxplot
   - Hour-of-day boxplot
4. **Assumptions**
5. **Feature engineering** (for the LightGBM model)
   - Lag features: `lag_1, lag_24, lag_168`
   - Rolling means: `roll_24h_mean, roll_7d_mean`
   - Calendar: `dow, hour, is_weekend, is_thai_holiday` (use `holidays.TH`)
   - Monsoon flag
6. **Feature selection** (same shallow-tree approach as notebook 01, applied to LightGBM lag-feature model)
7. **Models** — train all three:
   - **Prophet** with Thai holidays
   - **SARIMA** with weekly seasonal order
   - **LightGBM** with lag features
8. **Cross-validation**
   - Rolling-origin time-series CV (`TimeSeriesSplit`)
   - MAE / RMSE / MAPE for each model
9. **Hyperparameter tuning** (on the best of the 3 baseline runs)
10. **Evaluation**
    - 3-model comparison table
    - Winner's decomposition plot
    - 7-day forecast vs actual chart on held-out window
    - Residual plot
11. **Revenue uplift simulation**
    - Compare doctor revenue if online during predicted top-K slots vs random hours
    - Report % uplift
12. **Business summary**
13. **Export predictions** — writes `data/ml/demand_forecast_7d.json` for the demo doctor

---

## §8. API routes specification

All routes live in `src/app/api/`. All accept JSON, return JSON, support Edge runtime where possible.

### `POST /api/triage` — the killer-feature endpoint

**Request:**
```json
{ "symptom_text": "ปวดท้องน้อย ท้องเสีย 2 วัน ไข้ต่ำ ๆ" }
```

**Behavior:**
1. Embed `symptom_text` with `gemini-embedding-001`
2. Cosine-search `data/symptom_kb.json` for top-3 matches
3. Build LLM prompt with retrieved KB entries (system prompt from `Mordee_Plus_LLM_Prompts.md` §1)
4. Call `gemini-2.5-flash` with `response_schema` for structured JSON
5. Apply symbolic critical-keyword override (chest pain, stroke FAST signs → force `red`)

**Response:**
```json
{
  "triage": "yellow",
  "confidence": 0.82,
  "reasoning_th": "อาการของคุณดูเหมือนกระเพาะอาหารอักเสบจากการติดเชื้อ...",
  "recommended_action": "use_app",
  "specialty_hint": "Internal Medicine",
  "sources": [
    {"title":"Gastroenteritis · Mayo Clinic","url":"..."},
    {"title":"Thai Public Health Guidelines"}
  ]
}
```

### `POST /api/match` — doctor matching

**Request:** `{ "symptom_text": "...", "specialty_hint": "Internal Medicine" }`
**Behavior:** rule-based ranking from `doctors.json` (specialty match > rating > price proximity). LLM generates a one-line Thai "why this doctor" for each top-3.
**Response:**
```json
{
  "ranked": [
    {"doctor_id":"D002","score":0.95,"reason_th":"แพทย์อายุรกรรมที่มีประสบการณ์ 15 ปี เหมาะกับอาการของคุณ"}
  ]
}
```

### `POST /api/chat` — streaming chat (patient ↔ mock doctor OR doctor ↔ mock patient)

**Request:** `{ "role": "patient" | "doctor", "messages": [...], "doctor_id": "D002" }`
**Behavior:** Streams Gemini-generated chat turns from a scripted persona (other role's mocked side). Use Vercel AI SDK's `streamText`.
**Response:** `text/event-stream` of tokens.

### `POST /api/summarize` — chat → cert + self-care

**Request:** `{ "transcript": [{role, content}, ...], "patient_name": "...", "doctor_id": "..." }`
**Behavior:**
1. LLM (system prompt §3 in prompts file) extracts: diagnosis, ICD-10 hint, prescription mentions, follow-up
2. Generates two outputs: (a) medical certificate text in Thai (formal), (b) self-care guide in simple Thai
3. Returns both + extracted structure

**Response:**
```json
{
  "diagnosis": "Acute gastroenteritis",
  "icd10": "K52.9",
  "certificate_text_th": "...",
  "self_care_plan": {
    "summary_th": "...",
    "medications": [{...}],
    "diet_th": ["..."],
    "warning_signs_th": ["..."],
    "recovery_timeline_th": "..."
  },
  "needs_followup": true,
  "followup_in_days": 7
}
```

### `POST /api/followup` — decide if follow-up needed

(Already inside summarize response above. Standalone endpoint optional.)

### `GET /api/predict?type=no_show&id=NS001`

Reads from `data/ml/*.json` and returns the cached prediction. No live ML.

---

## §9. Doctor page specification (`src/app/doctor/page.tsx`)

### Layout (single scrollable page)

```
┌─────────────────────────────────────────────────────────────────┐
│  Top bar: MorDee+ logo · "Doctor: นพ. ธนพล" avatar              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────── Demand Forecast (GlassCard) ─────────────────┐    │
│  │ • Title + KPI ribbon (predicted bookings this week +N%) │    │
│  │ • 7-day hour-by-day heatmap (Recharts)                  │    │
│  │ • Recommended online slots chips (highlighted green)    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────── Today's Appointments (GlassCard) ────────────┐    │
│  │ List of 3 appointment cards                             │    │
│  │ Each card:                                              │    │
│  │  • Time · Patient name · Symptom                        │    │
│  │  • 🟢🟡🔴 no-show badge (from ML #1)                    │    │
│  │  • "Open" button → opens consult panel below            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────── Consult Panel (slides open) ─────────────────┐    │
│  │  Two-column split:                                      │    │
│  │  Left: Patient Brief (LLM-generated)                    │    │
│  │  Right: Chat panel with scripted patient + live scribe  │    │
│  │  Below: "End Consult" → triggers summarize → cert PDF   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────── Consult Summary (after End) ─────────────────┐    │
│  │  • Medical certificate (formal Thai)                    │    │
│  │  • Self-care plan card                                  │    │
│  │  • Follow-up needed? button to schedule                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### State (Zustand store `store-doctor.ts`)

```ts
type DoctorState = {
  selectedAppt: string | null;
  consultMessages: Message[];
  consultEnded: boolean;
  summary: ConsultSummary | null;
  setSelectedAppt: (id: string | null) => void;
  appendMessage: (m: Message) => void;
  endConsult: () => Promise<void>;  // calls /api/summarize
};
```

### Behavior

1. On mount: fetch demand forecast (GET `/api/predict?type=demand&id=DD01`) + appointments (read from `demo_scenarios.json`)
2. Each appointment card calls GET `/api/predict?type=no_show&id={prediction_id}` for its badge
3. Clicking "Open" sets `selectedAppt`, reveals consult panel below (scroll into view)
4. Patient Brief: on consult open, POST `/api/chat` with system prompt §4 in prompts file → renders brief
5. Chat: doctor types, scripted patient responses come from `/api/chat` streaming
6. End Consult: POST `/api/summarize` with the full transcript → renders summary card

---

## §10. Patient page specification (`src/app/patient/page.tsx`)

### Layout (single scrollable page with progressive disclosure)

```
┌─────────────────────────────────────────────────────────────────┐
│  Top bar: MorDee+ logo · "Patient: คุณ Pol"                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────── Symptom Chat (GlassCard) — START HERE ────────┐   │
│  │  Hello bubble · suggested prompt chips                   │   │
│  │  Input field                                             │   │
│  │  Once submitted: triage call → triage result below       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────── Triage Result (appears after symptom) ───────┐    │
│  │  Big 🟢🟡🔴 indicator + reasoning text                  │    │
│  │  Sources cited                                           │    │
│  │                                                          │    │
│  │  IF RED: Hospital list card (replaces everything below)  │    │
│  │  IF GREEN/YELLOW: continue to doctor list                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────── Doctor List (appears for green/yellow) ──────┐    │
│  │  Top 3 matched (highlighted) + remaining 12 below       │    │
│  │  Each card: avatar, name, specialty, rating, price      │    │
│  │  "Book" button → BookingDialog modal                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────── Booking Dialog (modal) ──────────────────────┐    │
│  │  Slot picker · "Talk Now" vs "Schedule"                 │    │
│  │  Confirm → MockPayment modal                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────── Mock Payment (modal) ────────────────────────┐    │
│  │  Order summary (consult fee 350-1000 ฿)                 │    │
│  │  Single "Pay" button · fake success animation           │    │
│  │  → Consult panel reveals                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────── Consult Chat ────────────────────────────────┐    │
│  │  Chat with mocked doctor persona                        │    │
│  │  Doctor proposes Rx in chat                             │    │
│  │  "End consult" button                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────── Consult Summary ─────────────────────────────┐    │
│  │  Same summary engine as doctor side                     │    │
│  │  Tabs: "Medical Cert" + "Self-Care Plan"                │    │
│  │  Follow-up needed? → BookingDialog for next visit       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### State (Zustand store `store-patient.ts`)

```ts
type PatientStep =
  | "symptom"
  | "triage"
  | "doctorList"
  | "booking"
  | "payment"
  | "consult"
  | "summary"
  | "followup";

type PatientState = {
  step: PatientStep;
  symptomText: string;
  triage: TriageResult | null;
  matchedDoctors: RankedDoctor[];
  selectedDoctor: Doctor | null;
  bookingSlot: { datetime: string } | null;
  consultMessages: Message[];
  summary: ConsultSummary | null;
  // actions
  submitSymptom: (text: string) => Promise<void>;
  selectDoctor: (id: string) => void;
  confirmBooking: (slot: {...}) => void;
  completePayment: () => void;
  endConsult: () => Promise<void>;
  goToNext: () => void;
};
```

### Behavior

- Each section appears with Framer Motion fade+slide-up as state advances
- RED triage replaces the rest with hospital list and stops the flow
- Smooth scroll to the newly revealed section
- All transitions ~300ms ease-out

---

## §11. LLM prompts library

See `Mordee_Plus_LLM_Prompts.md` for the full pre-written system prompts. Reference them by section number:
- §1 — Symptom triage (🟢🟡🔴 with RAG context)
- §2 — Doctor matching explanation
- §3 — Consult summary → cert + self-care
- §4 — Patient brief (for doctor side)
- §5 — Mock doctor persona (for patient's consult)
- §6 — Mock patient persona (for doctor's consult)

---

## §12. Build phases (3 weeks, day-by-day)

### Phase 1 — Setup + scaffolding (Sun–Mon, May 10–11) · 6 hrs

**Claude Code prompt:**
> Read VibeCoding_Plan.md. Implement Phase 1: scaffold the Next.js app per §3 (one-shot install), set up the file tree from §4, install shadcn/ui components listed in §3, create `globals.css` with the design tokens from §5, create empty `app/page.tsx` (landing with role selector), `app/patient/page.tsx` (placeholder), `app/doctor/page.tsx` (placeholder), and the `GlassCard` component. Don't implement any feature logic yet. Just the skeleton + the landing page.

Deliverable: app runs, landing renders with two big role cards leading to placeholder pages.

### Phase 2 — ML notebooks (Tue–Sat, May 12–16) · 22 hrs

**Don't use Claude Code for the notebooks — they require focused human ML work.** Use Cursor or VS Code Jupyter directly. The notebooks must be authored by you (with LLM assistance for individual cells) so the analysis story is yours to defend.

Day-by-day:
- **Tue 12** (5 hrs): Notebook 01 sections 1–5 (EDA + assumptions + feature engineering)
- **Wed 13** (5 hrs): Notebook 01 sections 6–9 (feature selection + train + tune + eval)
- **Thu 14** (4 hrs): Notebook 01 sections 10–13 (SHAP + simulated week + export). Notebook 02 sections 1–3
- **Fri 15** (4 hrs): Notebook 02 sections 4–8 (FE + 3-model train)
- **Sat 16** (4 hrs): Notebook 02 sections 9–13 (eval + revenue sim + export). **Also seed `symptom_kb.json` with ~50 LLM-curated entries + their embeddings.**

Output: `data/ml/no_show_predictions.json`, `data/ml/demand_forecast_7d.json`, `data/symptom_kb.json` populated.

### Phase 3 — Shared components + API routes (Sun–Tue, May 17–19) · 12 hrs

**Claude Code prompt:**
> Implement Phase 3: create the 5 API routes per §8 (`/api/triage`, `/api/match`, `/api/chat`, `/api/summarize`, `/api/predict`). Use Vercel AI SDK for streaming. Use Gemini SDK for embeddings. RAG cosine similarity helper goes in `lib/rag.ts`. Pull all LLM system prompts from `Mordee_Plus_LLM_Prompts.md`. Don't deviate from those prompts. Use `zod` schemas for validation. Build a tiny test script in `scripts/test-routes.ts` that hits each endpoint with one example.

Deliverable: all API routes return correct shapes; curl tests pass.

### Phase 4 — Doctor page (Wed–Fri, May 20–22) · 12 hrs

**Claude Code prompt:**
> Implement Phase 4: the doctor page per §9. Build all components in `components/doctor/`. Use the Zustand store shape from §9. Demand heatmap uses Recharts. Use Framer Motion for the consult panel reveal. Patient Brief panel calls the LLM with the prompt from §4 of LLM_Prompts. All glass surfaces via `GlassCard`. No new UI patterns — stick to the design system. The demand forecast and no-show data come from `/api/predict` (which reads JSON).

Deliverable: doctor page works end-to-end with the demo doctor (DD01) and demo appointments.

### Phase 5 — Patient page (Sat–Tue, May 23–26) · 14 hrs

**Claude Code prompt:**
> Implement Phase 5: the patient page per §10. Build all components in `components/patient/`. Progressive disclosure controlled by the Zustand `step` state machine in §10. Symptom chat is the entry point. Triage result has 3 visual states (green/yellow/red) with very different layouts (red replaces everything with hospital list). Booking dialog, mock payment, consult chat, consult summary all stay on the same page — use modals + scroll, never navigate. Use Framer Motion for transitions (fade+slideUp, 300ms ease-out).

Deliverable: full patient flow runs from symptom input to follow-up scheduling.

### Phase 6 — Polish + demo prep (Wed–Fri, May 27–29) · 10 hrs

**Claude Code prompts (sequential):**
> 1. "Review the design system compliance across all components. List anything that breaks GlassCard/color-token/typography rules. Fix them."
> 2. "Run through the demo path from §13. Find any state-leakage between scenarios. Add a 'Reset Demo' button."
> 3. "Add subtle hover states + transitions to interactive elements. Ensure focus-visible rings work for keyboard nav."
> 4. "Test on Safari + Chrome. Fix any glass/backdrop-filter rendering issues."

Then YOU (not Claude Code):
- **Wed 27 evening:** record the demo video (Loom)
- **Thu 28:** finalize slides 1–19 (see existing build plan)
- **Fri 29:** dress rehearsal twice

### Sat May 30 — Presentation day

---

## §13. Demo script (3 minutes, practice 10×)

```
[0:00] Land on /. Click "ฉันเป็นผู้ป่วย" (I am a patient)
[0:05] /patient loads. Type into symptom chat:
       "ปวดท้องน้อย ท้องเสีย 2 วัน ไข้ต่ำ ๆ คลื่นไส้"
[0:20] Triage card slides in showing 🟡 YELLOW
       + reasoning + 3 cited sources from KB
       Specialty hint: Internal Medicine
[0:35] Doctor list slides in — top 3 matched (highlighted)
       Click "Book" on Dr. Suphaporn (D002)
[0:45] BookingDialog opens — pick "Talk Now"
[0:50] MockPayment modal — click "ชำระเงิน 500 ฿"
       Success animation
[0:55] Consult chat opens — scripted doctor messages stream in
       Patient types one reply, doctor types a Rx in chat
[1:30] Click "End consult" → ConsultSummary card slides in
       Tabs: 📜 Medical Certificate · 💊 Self-Care Plan
       Show both briefly
[1:55] LLM says "Follow-up recommended in 7 days"
       Click "Schedule follow-up" → BookingDialog reuses → confirmed
[2:10] SWITCH ROLES: open new tab → / → click "ฉันเป็นแพทย์"
[2:15] /doctor loads as Dr. Tanapol (D001)
       Demand heatmap visible top — point out recommended slots
       (highlighted green cells)
[2:30] Below: today's appointments with 🟢🟡🔴 no-show badges
       Click 🔴 HIGH-risk appointment (Nang Wandi)
[2:40] Consult panel reveals
       Patient Brief on the left, chat on the right
       LLM scribe drafts SOAP in real time on the right of chat
[2:55] Cut to slides: notebook eval slides (ROC, SHAP, forecast bake-off)
[3:00] End slide
```

### Backup demos (cued and ready)

1. **Red triage** — type "เจ็บหน้าอกร้าวไปแขนซ้าย หายใจลำบาก" → big red card with hospital list + 1669
2. **Green triage** — type "ปวดหัวเล็กน้อย พักผ่อนน้อย" → green card with self-care tips
3. **Demand forecast detail slide** — show Prophet vs SARIMA vs LightGBM comparison

---

## §14. Pre-presentation checklist (May 30 morning)

- [ ] Both ML notebooks render top-to-bottom without errors
- [ ] All 5 API routes respond < 5s
- [ ] Doctor page loads with correct demand chart + 3 appointments + correct risk badges
- [ ] Patient page reset button works between demo runs
- [ ] All 3 backup demos (red/green + forecast slide) cued
- [ ] Demo video recorded as fallback
- [ ] Slides exported as PDF (in case PowerPoint fails)
- [ ] `.env.local` has Gemini key, charged
- [ ] Laptop fully charged + charger + HDMI adapter
- [ ] Practice 1 full run-through morning of

---

## §15. Rubric tracker — where each line lives

### MADT6004 (30 pts)

| Rubric line | Lives in | Target |
|---|---|---|
| Business problem (5) | Slide #2 hypothesis framing · notebook context cells | 5/5 |
| Data analysis (10) | Both notebooks: EDA + feature selection + 2 ML techniques + 3-model bake-off + tuning + SHAP | 10/10 |
| Interpretation (5) | Notebook business summary + cost-benefit slide + revenue sim chart + honest limitations | 5/5 |

### MADT7104 (100 pts)

| Rubric line | Lives in | Target |
|---|---|---|
| Business problem (10) | Slide #2 (Thai outpatient crisis) | 8–9 |
| Business value of problem (10) | Slide #2 quantified | 8–10 |
| Prototype UX (10) | Patient page Phase 5 | 8–9 |
| Prototype business value (10) | Slide #15 quantified | 8–10 |
| Product UX (10) | Both pages polish (Phase 6) | 8–9 |
| Product business value (10) | Slide #17 monetization rails | 8–10 |
| Final business model (10) | Slide #17 two-sided platform | 8–10 |
| Final UX (10) | Glassmorphism polish + agent activity visibility | 8–9 |
| Final AI features (10) | LLM + RAG + 2 ML + agent-style routing | 9–10 |
| Final business value (10) | Killer-chart slides #9 + #12 | 8–10 |

**Realistic total: 81–95.** A→A+.

---

## §16. Common pitfalls to avoid

1. **Don't let Claude Code regenerate doctor names.** Use the locked list in §6.
2. **Don't let Claude Code re-architect the ML.** Stick to JSON predictions; never add a Python sidecar.
3. **Don't break GlassCard.** Every panel uses it.
4. **Don't navigate.** Each page is single-route; everything else is modals or scroll sections.
5. **Don't skip the notebook feature-selection step.** This is the rubric centerpiece for MADT6004.
6. **Don't ad-lib LLM prompts.** Use the ones in `Mordee_Plus_LLM_Prompts.md` verbatim.
7. **Don't add a database.** All data is JSON files for the demo.
8. **Don't add auth.** Skip login screens.

---

## §17. Files in this delivery

- `Mordee_Plus_VibeCoding_Plan.md` — **this file**
- `Mordee_Plus_LLM_Prompts.md` — full system prompts library
- `Mordee_Plus_Architecture.svg` — for slides
- `Mordee_Plus_Patient_Journey.md` — for slides
- `Mordee_Plus_Design.md` — design rationale + rubric mapping
- `Mordee_Plus_Build_Plan.md` — earlier build plan (deprecated by this doc but useful for slides)

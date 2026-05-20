#!/usr/bin/env bash
# Smoke test: POST /api/triage — PD01 (yellow), PD02 (red via regex gate), PD03 (green).
# Run `pnpm dev` first; ensure GOOGLE_API_KEY is set in .env.
set -euo pipefail
BASE=${BASE:-http://localhost:3000}
JQ=$(command -v jq || echo "cat")

echo "--- PD01: gastroenteritis (expect yellow, Internal Medicine) ---"
curl -sS -X POST "$BASE/api/triage" \
  -H 'Content-Type: application/json' \
  -d '{"symptom_text":"ปวดท้องน้อย ท้องเสีย 2 วัน ไข้ต่ำ ๆ คลื่นไส้"}' | $JQ

echo "--- PD02: chest pain (expect RED via regex gate — NO LLM call) ---"
curl -sS -X POST "$BASE/api/triage" \
  -H 'Content-Type: application/json' \
  -d '{"symptom_text":"เจ็บหน้าอกร้าวไปแขนซ้าย หายใจลำบาก เหงื่อแตก 30 นาที"}' | $JQ

echo "--- PD03: mild headache (expect green, General Practice) ---"
curl -sS -X POST "$BASE/api/triage" \
  -H 'Content-Type: application/json' \
  -d '{"symptom_text":"ปวดหัวเล็กน้อย พักผ่อนน้อย เครียดจากงาน"}' | $JQ

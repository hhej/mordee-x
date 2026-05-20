#!/usr/bin/env bash
# Smoke test: POST /api/match — PD01 symptom + Internal Medicine.
# Expect top-3 doctors with D002 (Dr. Suphaporn) ranked #1 and reason_th ≤ 20 Thai words.
set -euo pipefail
BASE=${BASE:-http://localhost:3000}
JQ=$(command -v jq || echo "cat")

echo "--- PD01 + Internal Medicine ---"
curl -sS -X POST "$BASE/api/match" \
  -H 'Content-Type: application/json' \
  -d '{"symptom_text":"ปวดท้องน้อย ท้องเสีย 2 วัน ไข้ต่ำ ๆ คลื่นไส้","specialty_hint":"Internal Medicine"}' | $JQ

echo "--- PD03 + General Practice ---"
curl -sS -X POST "$BASE/api/match" \
  -H 'Content-Type: application/json' \
  -d '{"symptom_text":"ปวดหัวเล็กน้อย พักผ่อนน้อย เครียดจากงาน","specialty_hint":"General Practice"}' | $JQ

echo "--- ER (expect empty ranked list, frontend should show hospitals) ---"
curl -sS -X POST "$BASE/api/match" \
  -H 'Content-Type: application/json' \
  -d '{"symptom_text":"เจ็บหน้าอก","specialty_hint":"ER"}' | $JQ

#!/usr/bin/env bash
# Smoke test: POST /api/brief — DD01 appointment A001 (มะลิ / ไอเรื้อรัง).
# Expect structured brief with one_liner, ddx (3 entries), suggested_questions_th.
set -euo pipefail
BASE=${BASE:-http://localhost:3000}
JQ=$(command -v jq || echo "cat")

echo "--- DD01 / A001 มะลิ — chronic cough ---"
curl -sS -X POST "$BASE/api/brief" \
  -H 'Content-Type: application/json' \
  -d '{
    "patient_name":"มะลิ",
    "age":42,
    "gender":"F",
    "symptom_text":"ไอเรื้อรังมา 3 สัปดาห์ มีเสมหะเล็กน้อย ไม่มีไข้",
    "triage":"yellow",
    "history":"สูบบุหรี่ 10 ปี เลิกแล้ว 2 ปี"
  }' | $JQ

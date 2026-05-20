#!/usr/bin/env bash
# Smoke test: POST /api/chat — SSE stream from mock doctor persona (D002 internal medicine).
# Should emit `data: {"type":"token",...}` frames; possibly a `tool_call` event.
# Use `curl -N` to disable buffering.
set -euo pipefail
BASE=${BASE:-http://localhost:3000}

echo "--- patient → mock doctor D002 (Suphaporn, Internal Medicine) ---"
curl -sN -X POST "$BASE/api/chat" \
  -H 'Content-Type: application/json' \
  -d '{
    "role":"patient",
    "doctor_id":"D002",
    "patient_name":"สมศรี",
    "triage":"yellow",
    "symptom_text":"ปวดท้องน้อย ท้องเสีย 2 วัน ไข้ต่ำ ๆ คลื่นไส้",
    "messages":[
      {"role":"user","content":"สวัสดีค่ะ คุณหมอ หนูปวดท้องน้อย ท้องเสีย 2 วันแล้วค่ะ"}
    ]
  }'

echo
echo "--- doctor → mock patient (D001 + appt A001 มะลิ) ---"
curl -sN -X POST "$BASE/api/chat" \
  -H 'Content-Type: application/json' \
  -d '{
    "role":"doctor",
    "doctor_id":"D001",
    "patient_name":"มะลิ",
    "age":42,
    "gender":"F",
    "symptom_text":"ไอเรื้อรัง 3 สัปดาห์",
    "triage":"yellow",
    "history":"สูบบุหรี่ 10 ปี เลิกแล้ว 2 ปี",
    "patient_demo_brief":"คุณมีอาการไอเรื้อรังมา 3 สัปดาห์ มีเสมหะเล็กน้อย ไม่มีไข้ ประวัติสูบบุหรี่ 10 ปี เลิกแล้ว 2 ปี",
    "messages":[
      {"role":"user","content":"สวัสดีครับ คุณมะลิ วันนี้มีอาการอย่างไรบ้างครับ?"}
    ]
  }'
echo

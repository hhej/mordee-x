#!/usr/bin/env bash
# Smoke test: POST /api/summarize — scripted gastroenteritis transcript.
# Expect structured summary with medications array (paracetamol + ORS), ICD-10 estimate, formal cert text.
set -euo pipefail
BASE=${BASE:-http://localhost:3000}
JQ=$(command -v jq || echo "cat")

echo "--- Mock gastroenteritis consult (D002 + patient PD01) ---"
curl -sS -X POST "$BASE/api/summarize" \
  -H 'Content-Type: application/json' \
  -d '{
    "patient_name":"สมศรี",
    "doctor_id":"D002",
    "transcript":[
      {"role":"user","content":"สวัสดีค่ะ หนูปวดท้องน้อย ท้องเสีย 2 วันแล้ว มีไข้ต่ำ ๆ คลื่นไส้ค่ะ"},
      {"role":"assistant","content":"สวัสดีค่ะ คุณสมศรี ถ่ายเหลววันละกี่ครั้งคะ มีเลือดปนหรือไม่?"},
      {"role":"user","content":"วันละ 5-6 ครั้งค่ะ ไม่มีเลือด แต่มีน้ำมาก"},
      {"role":"assistant","content":"กินอะไรผิดสำเภาก่อนหน้านี้ไหมคะ เช่น อาหารริมทาง?"},
      {"role":"user","content":"ใช่ค่ะ กินส้มตำเมื่อ 3 วันก่อนค่ะ"},
      {"role":"assistant","content":"เป็นกระเพาะอาหารและลำไส้อักเสบจากอาหารน่ะค่ะ จะให้ ORS ผสมน้ำ 1 ซองทุก 3 ชั่วโมง และ paracetamol 500mg ทาน 1 เม็ดทุก 6 ชั่วโมง ถ้ามีไข้ ทาน 5 วัน หลีกเลี่ยงอาหารรสจัดและนมค่ะ"},
      {"role":"user","content":"ขอบคุณค่ะ คุณหมอ ต้องกลับมาตรวจอีกไหมคะ?"},
      {"role":"assistant","content":"ถ้าอาการไม่ดีขึ้นใน 3 วัน หรือถ่ายเป็นเลือด ให้กลับมาพบหมอทันทีค่ะ"}
    ]
  }' | $JQ

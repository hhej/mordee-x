#!/usr/bin/env bash
# Smoke test: GET /api/predict — no-show NS001/2/3 + demand DD01.
# Run `pnpm dev` first.
set -euo pipefail
BASE=${BASE:-http://localhost:3000}
JQ=$(command -v jq || echo "cat")

echo "--- no_show NS001 (LOW expected) ---"
curl -sS "$BASE/api/predict?type=no_show&id=NS001" | $JQ

echo "--- no_show NS002 (MED expected) ---"
curl -sS "$BASE/api/predict?type=no_show&id=NS002" | $JQ

echo "--- no_show NS003 (HIGH expected) ---"
curl -sS "$BASE/api/predict?type=no_show&id=NS003" | $JQ

echo "--- demand DD01 (168 by_hour entries expected) ---"
curl -sS "$BASE/api/predict?type=demand&id=DD01" | $JQ '{doctor_id, horizon_days, by_hour_count: (.by_hour | length), recommended_online_slots, expected_revenue_uplift_pct, winning_model}'

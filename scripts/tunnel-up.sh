#!/usr/bin/env bash
# One command to (re)connect the MorDee+ production backend to this laptop.
#
# Topology: the real backend (LLM/RAG, GOOGLE_API_KEY) runs here via `pnpm dev`.
# Vercel serves the static pages and proxies /api/* to a Cloudflare quick tunnel
# (next.config.ts `beforeFiles` rewrite, keyed on LOCAL_API_TUNNEL_URL). Quick
# tunnels get a fresh URL each run, so this script: starts the tunnel, points
# LOCAL_API_TUNNEL_URL at it, redeploys, smoke-tests, then holds it open.
#
# Usage:  pnpm tunnel        (or: bash scripts/tunnel-up.sh)
# Stop:   Ctrl-C             (tears the tunnel down cleanly)
set -euo pipefail

cd "$(dirname "$0")/.."            # run vercel commands from the linked project root
PORT="${PORT:-3000}"
LOG="$(mktemp -t mordee-cloudflared.XXXXXX)"

# 0. The local dev server must be up — it IS the backend.
if ! lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✗ No dev server on :$PORT. Start it first in another terminal:  pnpm dev"
  exit 1
fi

# 1. Launch the quick tunnel; capture its public URL from the log.
echo "▸ Starting Cloudflare quick tunnel → localhost:$PORT …"
cloudflared tunnel --url "http://localhost:$PORT" >"$LOG" 2>&1 &
TUNNEL_PID=$!
trap 'echo; echo "▸ Stopping tunnel (pid $TUNNEL_PID)…"; kill "$TUNNEL_PID" 2>/dev/null || true' EXIT

URL=""
for _ in $(seq 1 30); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1 || true)
  [ -n "$URL" ] && break
  sleep 1
done
if [ -z "$URL" ]; then
  echo "✗ Tunnel URL never appeared. Last log lines:"; tail -15 "$LOG"; exit 1
fi
echo "▸ Tunnel URL: $URL"

# 2. Repoint Vercel's production rewrite at this URL (replace any prior value).
echo "▸ Updating LOCAL_API_TUNNEL_URL on Vercel (production)…"
vercel env rm LOCAL_API_TUNNEL_URL production --yes >/dev/null 2>&1 || true
printf "%s" "$URL" | vercel env add LOCAL_API_TUNNEL_URL production >/dev/null 2>&1

# 3. Redeploy — next.config.ts reads LOCAL_API_TUNNEL_URL at build time.
echo "▸ Redeploying to production…"
vercel deploy --prod --yes 2>&1 | grep -iE "Aliased|Error|BUILD_ERROR" || true

# 4. Smoke-test the full chain: Vercel → tunnel → laptop → Gemini.
code=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' -X POST https://mordee-x.vercel.app/api/triage \
  -H 'Content-Type: application/json' -d '{"symptom_text":"ปวดหัว"}' --max-time 60 || echo ERR)
echo "▸ POST /api/triage → HTTP $code  (expect 200)"
echo "✓ Live: https://mordee-x.vercel.app  →  $URL  →  localhost:$PORT"

# 5. Hold the tunnel open. Closing this process (Ctrl-C) tears it down.
echo "▸ Tunnel running. Keep this terminal open during the demo. Ctrl-C to stop."
wait "$TUNNEL_PID"

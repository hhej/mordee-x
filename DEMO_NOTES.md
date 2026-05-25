# MorDee+ — Demo day cheat sheet

Generated during Phase 6 polish. Keep this open during dress rehearsal and on demo day.

---

## 1. Run the demo

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Demo machine should be plugged in + on stable Wi-Fi (the triage / chat / summary routes hit Gemini live).

## 2. Reset between runs

Press **Cmd + Shift + 0** (Mac) or **Ctrl + Shift + 0** (Win) **anywhere in the app**.
Both Zustand stores nuke + page redirects to `/`. Persona is preserved.

## 3. Demo script anchors (§13)

| Time | Path | Cue |
|------|------|-----|
| 0:00 | `/` | Click "ฉันเป็นผู้ป่วย" |
| 0:05 | `/patient` | Click 🤢 chip (PD01) → ส่ง |
| 0:20 | — | Wait for 🟡 triage card |
| 0:35 | — | Click "จอง" on a top-3 doctor |
| 0:45 | — | Confirm booking → pay → wait for ✅ success |
| 0:55 | — | Patient says hi; let doctor reply stream in (≥2 msgs) |
| 1:30 | — | Click "จบการปรึกษา" → summary card mounts |
| 2:10 | `/` (new tab) | "ฉันเป็นแพทย์" → demand heatmap, click 🔴 row |
| 3:00 | slides | ROC, SHAP, Prophet vs SARIMA bake-off |

**What's new in this build — collapse + takeover (2026-05-25):**

- **Patient side**: empty state shows a full-width textarea with an "หรือข้ามไปปรึกษาทันที" instant-consult option below. After each step the previous card collapses into a slim mint pill at the top — by consult time you should see 3 pills stacked (✓ symptom · 🟡 triage · 👨‍⚕️ doctor) above the chat. Click a pill's chevron to peek at the full card inline; click again or move to the next step to collapse. The symptom pill is read-only (hover shows "เริ่มใหม่" hint).
- **Doctor side**: clicking "เปิด" on an appointment hides the dashboard entirely and shows a sticky "← กลับไปคิวผู้ป่วย · คิวรอ · N" takeover header. Heatmap is one click away, not a scroll flick. After "จบการปรึกษา", the summary swaps in-place; the bottom "เสร็จสิ้น · กลับไปคิวผู้ป่วย" returns to the dashboard.
- **Red path**: TriageResultCard is now a thin red strip above the hospital list, so "ไปโรงพยาบาลทันที" no longer appears twice.

**Backup demos (cued, both verified by Playwright):**

- Red: chest pain → 🔴 thin red strip + hospital list + 1669
- Green: mild headache → 🟢 + doctor list

## 4. Backup URL (Vercel preview) — manual finish

The Vercel project is linked (`hhejs-projects/mordee-x`) but env vars + first deploy need 3 one-time manual steps. The CLI's non-interactive secret handling collided with the in-session secret-leak guard, so this part is on you:

```bash
# Push env vars to Preview (paste the actual values when prompted)
vercel env add GOOGLE_API_KEY preview
vercel env add GEMINI_MODEL    preview

# Deploy
vercel deploy
```

That prints a preview URL — paste it below for demo day:

> Preview URL: ____________________________________________

If the laptop dies on stage, this URL is the rescue path.

## 5. Pre-flight checklist (run morning-of)

- [ ] `pnpm dev` boots cleanly, landing renders mint gradient + glass cards
- [ ] `pnpm exec playwright test` — 12/12 pass (chromium + webkit)
- [ ] Eyeball `tests/e2e/__screenshots__/walk-{chromium,webkit}-*.png` side-by-side, look for blur/font issues
- [ ] Cmd+Shift+0 works on `/patient` and `/doctor`
- [ ] Run the §13 main path live, end-to-end, once
- [ ] Run both backup demos (red + green chips) live, once each
- [ ] `.env` has `GOOGLE_API_KEY` and `GEMINI_MODEL` (otherwise triage 500s)

## 6. If something breaks on stage

| Symptom | Action |
|---------|--------|
| Triage spinner forever | Wi-Fi died — switch to phone hotspot, Cmd+Shift+0, retry |
| Doctor list empty | LLM `match` route returned [] — talk through it, or refresh and use `bypassToDoctorList` (click ลองอาการอื่น then "ดูแพทย์ทั้งหมด") |
| Payment hangs | The 2s mock delay is `MOCK_PAYMENT_DELAY_MS` in `src/lib/constants.ts` — nothing to fix, just wait |
| Consult chat says HTTP 500 | Check `.env` GOOGLE_API_KEY isn't expired |
| Glass cards look flat | You're on Firefox or old Safari — switch to Chrome |

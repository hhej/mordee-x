# MorDee+ — improvement.md

_Generated 2026-05-22 by adversarial QA pass. Targets demo 2026-05-30 (8 days out)._

Each item: title · repro/evidence · file:line · suggested fix · effort (S = <30min, M = ~half day, L = ~full day). Surface tag in title. Check off as you go.

Findings come from two sources:
- **🎯 reproduced** — driven via Playwright (`tests/e2e/qa-adversarial.spec.ts`, deleted after this audit) against the running dev server with mocked LLM endpoints
- **📖 code-level** — read from source, not driven via UI (either hard to reach or the spec couldn't easily express it)

---

## Critical (must fix before demo)

### 🎯 C-01 · [Patient · Booking] Scheduled booking opens chat immediately as if "now"

The user-reported bug. Picking a future timeslot (e.g. tomorrow 2pm), confirming and paying still flips `step: 'consult'` and the chat panel kicks off a doctor greeting within seconds.

- [ ] **Repro:**
  1. Go to `/patient`
  2. Click "ดูแพทย์ทั้งหมด · See all doctors" on the InstantConsultCard (skips triage)
  3. Click any doctor's `จอง` button
  4. Switch to the **"จองล่วงหน้า · Schedule"** tab
  5. Pick any slot (e.g. tomorrow 14:00)
  6. Click **"ยืนยัน จ่ายเงิน →"**, then **"พร้อมเพย์ จ่าย"**
  7. Within ~3s: chat opens with `ห้องปรึกษา` heading, doctor greeting streams in

- **Evidence:** `tests/e2e/__screenshots__/qa-scheduled-bug.png`
- **Code:** `src/stores/store-patient.ts:212` (`completePayment` unconditionally sets `step: 'consult'`, ignoring `bookingMode` and `bookingSlot` set at lines 71-76); `src/components/patient/PatientConsultPanel.tsx:33-41` (auto-fires `kickoff()` whenever `step === 'consult'`).
- **Suggested fix:** In `completePayment`, branch on `bookingMode`. For `'scheduled'`, do NOT set `step: 'consult'` — instead set a new `step: 'scheduledConfirmed'` and render a confirmation card showing the booked slot, doctor name/avatar, a "เพิ่มลงปฏิทิน" button (calendar `ics` blob), and a "ฉันมาผิดเวลา · ยกเลิกการนัด" link. The `kickoff()` should only run for `bookingMode === 'now'`. Bonus: persist scheduled bookings to localStorage so a reload doesn't lose them.
- **Effort:** M

### 🎯 C-02 · [Patient · Booking] D001's schedule slot grid shows PAST dates from stale ML JSON

The slot grid for Dr. D001 reads timestamps directly from `data/ml/demand_forecast_7d.json`. That file is static and was generated when the notebook last ran. As of today (2026-05-22) the earliest slot is `2026-05-19T23:00` — already **3 days in the past**. By demo day (2026-05-30) the entire grid will be **8-15 days stale**.

- [ ] **Repro:**
  1. Go to `/patient`, pick a yellow scenario, get to doctor list (D001 is the demo recommendation)
  2. Click `จอง` on Dr. ธนพล ใจกล้า (D001), open the "จองล่วงหน้า" tab
  3. Observe day headers: `อังคาร 19 พ.ค., พุธ 20 พ.ค., พฤหัส 21 พ.ค.…`

- **Evidence:** Test run output `H-02` — dates were `["อังคาร 19 พ.ค.","พุธ 20 พ.ค.","พฤหัส 21 พ.ค."]` while system clock = 2026-05-22.
- **Code:** `data/ml/demand_forecast_7d.json` (hardcoded `datetime` strings); `src/lib/slot-generator.ts:90-108` (`slotsFromDemandForecast` uses them verbatim); `src/components/patient/ScheduleSlotGrid.tsx:58-64` (special-case for D001).
- **Suggested fix:** Two options:
  1. **Quick (S):** In `slotsFromDemandForecast`, shift the by_hour datetimes so the first non-stale hour aligns with `startOfTomorrow(new Date())`. Preserves the Prophet shape (busy/quiet pattern by hour-of-day) without exposing the absolute dates from the notebook run.
  2. **Right (M):** Re-bake `data/ml/demand_forecast_7d.json` weekly via a `pnpm refresh:forecast` script that re-runs nb02 with `now()` set to today, OR generate the grid at runtime from a pattern + today's date.
- **Effort:** S (option 1) / M (option 2). For demo, **option 1 is the safe pick**.

### 📖 C-03 · [Shared · Demo] No graceful fallback when `GOOGLE_API_KEY` rate-limits or fails

Every interactive flow (triage, match, brief, chat, summarize) hits Gemini live with no offline fallback. If the key is rate-limited or the network is bad on demo day, the user sees a red error box with `HTTP 500` and the demo stalls. There is no `error.tsx` and no client-side timeout, so a hung stream leaves `isStreaming: true` forever.

- [ ] **Repro (won't drive in spec, observable by inspection):**
  - Rename `.env`'s `GOOGLE_API_KEY` and restart → every API route 500s.
  - Throttle network to Slow 3G in DevTools → triage spinner shows indefinitely with no client timeout.
- **Code:** `src/app/api/*/route.ts` (all routes); no `src/app/error.tsx`; no `AbortController` in the chat stream reader (`src/stores/store-patient.ts:359-431`).
- **Suggested fix:** Three layers:
  1. **Client-side fetch timeout (S):** Wrap every `/api/*` `fetch` with `AbortSignal.timeout(20_000)` (30s for chat stream). On abort, set the existing `*Error` field to a friendly Thai message: `"AI ตอบช้าผิดปกติ — ลองอีกครั้ง"`.
  2. **Backup demo path (M):** Add a `?mock=1` URL param that swaps every API to deterministic mock responses (the same ones `qa-adversarial.spec.ts` uses). Tell the audience: "On stage I'll fall back to canned data if the network gets weird."
  3. **`src/app/error.tsx` (S):** Friendly fallback page with "Reload" button + a `Sentry`-less console log.
- **Effort:** M total.

---

## High (should fix before demo)

### 🎯 H-01 · [Patient · Booking] Schedule grid doesn't mark "วันนี้" — easy to misread

The grid shows day headers like `อังคาร 19 พ.ค.` with no "today" / "พรุ่งนี้" emphasis. Combined with C-02 above, audience can't tell at a glance whether a slot is past or future.

- [ ] **Repro:** Open scheduled tab on any doctor — note plain weekday/date headers; no relative-time label.
- **Code:** `src/components/patient/ScheduleSlotGrid.tsx:40-47` (`thaiDateLabel`).
- **Suggested fix:** In `thaiDateLabel`, compare `dateKey` against `new Date().toISOString().slice(0,10)`. If equal, return `วันนี้ · 19 พ.ค.`. If equals tomorrow, return `พรุ่งนี้ · 20 พ.ค.`. Otherwise the existing label.
- **Effort:** S

### 📖 H-02 · [Patient · Consult] End-consult button enables instantly because `kickoff` adds 2 messages

The guard `consultMessages.length < 2` is supposed to require the patient to chat with the doctor before ending. But `kickoffConsult` (line 236-242) opens with a user message; the doctor reply makes the count 2. So end-consult is enabled the moment the kickoff stream completes, before the patient has typed anything themselves.

- [ ] **Repro:** Enter consult → don't type anything → wait for the doctor's first reply to finish → "จบการปรึกษา" enables → click it → empty-consult summary loads.
- **Code:** `src/components/patient/PatientConsultPanel.tsx:116` (the guard); `src/stores/store-patient.ts:236-242` (kickoff).
- **Suggested fix:** Change the guard to count only user-authored messages: `consultMessages.filter(m => m.role === 'user').length < 2`. Or count the post-kickoff messages: `consultMessages.length < 3` (1 kickoff user + 1 doctor + 1 real user reply).
- **Effort:** S

### 📖 H-03 · [Patient · Consult] Stream error is sticky — doesn't clear when user retries

After a chat stream fails (`streamError` set), the next successful `sendPatientMessage` doesn't clear the red banner. The banner sits above the input forever, making the chat look broken even after recovery.

- [ ] **Repro (would need network mock to drive):** Mock `/api/chat` to 500 once → stream errors → mock back to OK → next send streams normally but the red `⚠ HTTP 500` banner remains.
- **Code:** `src/stores/store-patient.ts:357-431` (streamPatientTurn); `src/components/shared/ChatStream.tsx:100-103` (banner).
- **Suggested fix:** At the top of `streamPatientTurn`, `set({ streamError: null })` before kicking the new request.
- **Effort:** S

### 📖 H-04 · [Doctor · Consult] Close X mid-stream doesn't abort the in-flight `/api/chat`

Clicking the close button on `ConsultPanel` calls `closeAppt()` which resets store state and unmounts the panel. But the fetch + SSE reader keeps running in the background; tokens are appended to `consultMessages` (which is `[]` now), so they're silently lost — the Gemini quota burns for nothing.

- [ ] **Repro:** Open appointment → send a message → as the doctor's reply streams in, click the X. The panel disappears but DevTools Network shows `/api/chat` still streaming.
- **Code:** `src/stores/store-doctor.ts:155-235` (no `AbortController`); patient side has the same bug at `src/stores/store-patient.ts:357-431`.
- **Suggested fix:** Hold an `AbortController` ref in the store; `closeAppt`/`reset` calls `controller.abort()`. Wrap `fetch` with `signal: controller.signal`. Same on patient side.
- **Effort:** M (touch both stores; verify no leaks across rapid open→close).

### 🎯 H-05 · [Patient · Persona] Age input silently coerces "abc" to 0

Pasting a non-numeric value (or somehow setting age to NaN) results in `0` being persisted to localStorage and shown in the header chip as `· 0 · ช`. No error message. The triage/brief/summary prompts all interpolate `age` — an age=0 patient is plausible (infant) but surprising for the actual user.

- [ ] **Repro:** Open persona popover → clear age → type `abc` (browser ignores), click บันทึก → header shows `คุณ Pol· 0 · ช`.
- **Code:** `src/components/patient/PatientPersonaPopover.tsx:82` (`onChange={(e) => setAge(Number(e.target.value) || 0)}`).
- **Suggested fix:** Validate on save. If `age` is not a number in `[1, 120]`, refuse to close the popover and show a red hint below the input. Or fall back to the prior value rather than 0.
- **Effort:** S

### 📖 H-06 · [Patient · Persona] Empty `name` saves silently — header chip starts with `·`

`setPersona({ name: '', ... })` writes to localStorage without complaint. Header chip then renders `<UserIcon /> · 28 · ช` with a leading separator. (The test couldn't reproduce because the input is pre-populated from `persona.name` and `fill('')` didn't actually clear; manual repro: select-all + delete + save.)

- [ ] **Repro:** Open persona popover → click name input → Cmd+A, Backspace → click บันทึก.
- **Code:** `src/components/patient/PatientPersonaPopover.tsx:29-32` (`onSave` has no validation).
- **Suggested fix:** Disable the บันทึก button when `name.trim().length === 0`. Or fall back to persisted persona.name on empty save.
- **Effort:** S

### 📖 H-07 · [Doctor · Followup] "ระบบส่ง SMS แจ้งคนไข้แล้ว" lies

`DoctorFollowupRow` shows `ระบบส่ง SMS แจ้งคนไข้แล้ว` (System sent SMS to patient) after the doctor clicks "จองนัดติดตาม". Nothing was actually sent — `setBooked(true)` is local React state with no API call. For a graded demo this is risky: a sharp grader will ask "show me the SMS log".

- [ ] **Repro:** Open A001 on `/doctor` → send a chat message → end consult → on the cert tab, click "จองนัดติดตาม" → see the SMS text.
- **Code:** `src/components/doctor/ConsultSummaryShell.tsx:49-94`.
- **Suggested fix:** Either soften the copy ("ระบบจะส่ง SMS แจ้งคนไข้อัตโนมัติ"  — future tense, with `·` Demo mode hint) or wire it to a no-op POST to a new `/api/followup` route that just logs+returns OK. Same fix for patient-side `FollowupCallout` (`src/components/patient/FollowupCallout.tsx:37`).
- **Effort:** S (copy fix) / M (API route + persistence).

---

## Medium (after demo, or this week if time permits)

### 🎯 M-01 · [Patient · Hospital] Red triage screen has no exit affordance

Once triage classifies as RED, the patient lands on the hospital list. The only way out is the global `ResetButton` in the header. There's no "ฉันไม่ได้เป็นแบบนั้น · This isn't right" button.

- [ ] **Repro:** Trigger PD02 chest-pain path → land on hospital list → no in-card back/dismiss button.
- **Code:** `src/components/patient/HospitalListCard.tsx`; `src/stores/store-patient.ts` (no out-edge from `step: 'hospital'`).
- **Suggested fix:** Add a small `ghost` button below the 1669 banner: "บรรเทาเอง · กลับไปประเมินอาการใหม่" → calls `reset()`. Audience signals you take false positives seriously.
- **Effort:** S

### 🎯 M-02 · [Doctor · Followup] Booking lost on close→reopen (no persistence)

`DoctorFollowupRow` uses `useState`; closing the consult and reopening resets everything because `openAppt` clears the store. Same issue on patient side (`FollowupCallout`).

- [ ] **Repro:** Open A001 → end consult → click "จองนัดติดตาม" → see "✓ จองแล้ว" → close X → reopen A001 → end consult again → followup row shows unbooked.
- **Code:** `src/components/doctor/ConsultSummaryShell.tsx:49-94`; `src/components/patient/FollowupCallout.tsx:23-65`.
- **Suggested fix:** Lift `booked` into the respective Zustand store keyed by `appointmentId` (doctor) / `selectedDoctorId+slot` (patient). If we want fake persistence, write to localStorage too.
- **Effort:** S

### 📖 M-03 · [Patient · Match] Doctor match returns `[]` for ER specialty hint

`runMatch` short-circuits to `{ ranked: [] }` when `specialty_hint === 'ER'`. The UI handles this gracefully on the red path (it shows hospital list instead). But if any non-red triage somehow sets ER as the hint (e.g. yellow + ER edge case), the user lands on doctor list with no recommendations and only the "see all 15" expand option.

- [ ] **Code:** `src/lib/llm/graphs/match.ts:36-44`.
- **Suggested fix:** Defense in depth — when `matched.length === 0 && !matchError && triage.specialty_hint === 'ER'`, route to hospital instead of empty doctor list.
- **Effort:** S

### 📖 M-04 · [Patient · Reset] `Cmd+Shift+0` mid-payment is a race the test didn't trigger but the code allows

The spec didn't repro (the reset fired before the async chain made dangerous progress), but on a slower machine the 0.9s `paymentSuccess` flash could finish AFTER the reset, re-applying `step: 'consult'` on top of the freshly-reset store. Symptom: user smashes the reset shortcut, lands on `/`, then ~1s later the page redirects them into consult.

- [ ] **Code:** `src/stores/store-patient.ts:203-223` (`completePayment` async chain has no cancellation).
- **Suggested fix:** In `completePayment`, capture a closure-local `cancelled = false`; in `reset()`, find a way to set it (e.g. bump a `paymentEpoch` counter and abort if it changes). Or just guard `set({ step: 'consult' })` with a check that `paymentOpen` is still true.
- **Effort:** M

### 📖 M-05 · [Doctor · Patient queue] Appointment without no-show prediction is silently skipped

`AppointmentsCard` maps over `appointments` and `return null` for any without a `prediction_id` match. Silent. If demo data ever drifts, the doctor sees fewer appointments than expected and we don't know why.

- [ ] **Code:** `src/components/doctor/AppointmentsCard.tsx:24-26`.
- **Suggested fix:** Render the row anyway with a muted "ไม่มีคะแนน no-show" badge. Surface the schema mismatch instead of hiding it.
- **Effort:** S

### 📖 M-06 · [Shared · Inputs] No character/line limits on symptom, chat, or persona history

A pasted 50kb essay submits to `/api/triage` and `/api/chat`. Gemini will truncate or 400. The UI has no visible counter or limit.

- [ ] **Code:** `src/components/patient/SymptomChat.tsx:75-89`; `src/components/shared/ChatStream.tsx:134-147`; `src/components/patient/PatientPersonaPopover.tsx:94-101`.
- **Suggested fix:** Add `maxLength={2000}` to symptom and chat inputs, `maxLength={500}` on history. Show a `1234/2000` counter when within 20% of the limit.
- **Effort:** S

### 📖 M-07 · [Shared · A11y] Chat messages region has no `aria-live`; screen readers miss streamed tokens

The `aria-live` count of 1 in the spec is the modal overlay, not the chat scroll container. New tokens streaming into the assistant bubble are not announced to assistive tech.

- [ ] **Code:** `src/components/shared/ChatStream.tsx:73-99` (the `<div ref={scrollRef}>` chat scroll region).
- **Suggested fix:** Add `aria-live="polite"` and `aria-atomic="false"` to the scroll container. Wrap each `Bubble` in a `role="article"` or similar. The streaming cursor `▍` should be `aria-hidden`.
- **Effort:** S

### 📖 M-08 · [Patient · Consult] Hardcoded "3 นาที" wait copy clashes with instant chat

`INSTANT_CONSULT_WAIT_TH = "3 นาที"` appears in `InstantConsultCard`, `BookingDialog` (now tab), and `MockPaymentDialog`. The actual chat opens in <1s. Audience may notice and ask why.

- [ ] **Code:** `src/lib/constants.ts:4-5` and three components that import it.
- **Suggested fix:** Either reduce to "ไม่กี่วินาที" or add a brief mock-typing delay before kickoff (e.g. 1.5s with a "คุณหมอกำลังเข้าห้อง…" placeholder). Better for demo credibility.
- **Effort:** S

### 📖 M-09 · [Patient · Match] Match error doesn't surface a retry

`matchError` sets a red banner but no "ลองอีกครั้ง" button. User can use the bypass to see all 15 doctors but the match was the AI value-prop — losing it without retry is poor UX.

- [ ] **Code:** `src/components/patient/DoctorMatchList.tsx:56-60`; `src/stores/store-patient.ts:333-350`.
- **Suggested fix:** Add a retry button in the error banner that re-calls `runMatch` with the current symptom + specialty hint.
- **Effort:** S

### 📖 M-10 · [Shared · Persistence] Consult and summary lost on reload

Mid-consult page reload wipes the chat history, summary, and any followup booking. For a demo this is acceptable — but a sharp grader will ask "what if I close my tab?". A simple `persist` wrapper on the patient store (currently only `persona` is persisted) would buy resilience cheaply.

- [ ] **Code:** `src/stores/store-patient.ts` (no `persist` middleware); `src/stores/store-doctor.ts` (same).
- **Suggested fix:** Wrap the patient store with Zustand `persist` middleware, whitelist `step`, `triage`, `matched`, `selectedDoctorId`, `consultMessages`, `summary`, `consultEnded`. Skip ephemerals (`isTriaging`, `isMatching`, etc.). Be careful: a persisted `isStreaming: true` would lock the UI on next load — explicitly reset it on rehydrate.
- **Effort:** M

---

## Low (post-demo polish)

### 🎯 L-01 · [Shared · Error pages] No `not-found.tsx` or `error.tsx`

Unknown routes 404 but render the Next default page (technical, English). The brand stops at the homepage.

- [ ] **Code:** missing `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx`.
- **Suggested fix:** Add a minimal `not-found.tsx` with a GlassCard, the MorDee+ wordmark, "ไม่พบหน้าที่คุณต้องการ", and a link back to `/`. Same shape for `error.tsx` with a Retry button. Consistent with mint design system.
- **Effort:** S

### 📖 L-02 · [Shared · Images] Doctor avatars from `i.pravatar.cc` — external dep with no fallback

15 doctors all use `https://i.pravatar.cc/150?img=N`. If pravatar.cc is down or blocked on the presenter Wi-Fi, every avatar 404s and shows a broken-image icon. The `unoptimized` flag on `<Image>` means no Next/Vercel caching either.

- [ ] **Code:** `src/data/doctors.json` (avatar URLs); multiple components that render `<Image src={d.avatar} />`.
- **Suggested fix:** Save the 15 pravatar images locally to `public/avatars/D001.jpg`...`D015.jpg`, update `doctors.json`. Add `placeholder="blur"` for ones we generate blur data for.
- **Effort:** S

### 📖 L-03 · [Patient · ConsultPanel] No visible "scheduled at X" cue once consult opens

Even before C-01 is fixed, the consult panel doesn't echo the booking decision. The header just shows doctor name + specialty. Users don't see "this was your 14:00 booking".

- [ ] **Code:** `src/components/patient/PatientConsultPanel.tsx:65-84`.
- **Suggested fix:** When `bookingMode === 'scheduled'`, render a small `Clock` pill above the chat: `📅 นัด 23 พ.ค. 14:00 · ใช้เวลาจริง`. Same pill for `'now'` reads `🟢 ปรึกษาสด · จับคู่ทันที`.
- **Effort:** S

### 📖 L-04 · [Doctor · Demand heatmap] Heatmap tooltip can clip the right edge on narrow viewports

Hover tooltip on `DemandHeatmap` is absolutely positioned; on 390px viewport at the 22:00–23:00 cells the tooltip extends past viewport-right with no flip.

- [ ] **Code:** `src/components/doctor/DemandHeatmap.tsx:159-168`.
- **Suggested fix:** Detect tooltip overflow and apply `right: 0` / `left: auto` when near the edge. Or use a portal-based tooltip primitive like base-ui's `Tooltip` which handles collision.
- **Effort:** S

### 📖 L-05 · [Shared · Print] Long diagnosis names wrap awkwardly on the printed cert

`SYSTEM_SUMMARY` asks for 120-180 word Thai cert text but can produce longer outputs. The print CSS doesn't `widows`/`orphans` control, so the doctor signature block can split across pages.

- [ ] **Code:** `src/app/globals.css:135-153` (print rules); `src/components/shared/MedicalCertificate.tsx`.
- **Suggested fix:** Add `@media print { #cert-print-area { page-break-inside: avoid } .cert-signature { page-break-before: avoid } }`. Optionally tighten the prompt to "ไม่เกิน 200 คำ".
- **Effort:** S

### 📖 L-06 · [Patient · Reset] Reset doesn't scroll-restore or clear focus

`ResetButton.onClick` does `window.scrollTo({top: 0, behavior: 'smooth'})` but if a popover/dialog was open, its focus trap may flash visible briefly before unmounting.

- [ ] **Code:** `src/components/patient/ResetButton.tsx:7-21`.
- **Suggested fix:** Before `reset()`, explicitly close any open dialogs (`set({ bookingOpen: false, paymentOpen: false })`). Already part of `reset()` itself but the ordering matters for the animation exit.
- **Effort:** S

---

## Polish (nice-to-have)

### 📖 P-01 · [Shared · Glass card] Glass effect falls flat on Firefox / old Safari

Already documented in `DEMO_NOTES.md:76` ("switch to Chrome"). Worth one extra layer of defense.

- [ ] **Code:** `src/app/globals.css:94-100`.
- **Suggested fix:** Use `@supports (backdrop-filter: blur(20px))` to gate the glass treatment; on browsers without support, fall back to `rgba(255,255,255,0.85)` opaque white. Looks intentional rather than broken.
- **Effort:** S

### 📖 P-02 · [Patient · Chat] No "doctor is typing…" pause between kickoff trigger and first token

Streaming starts instantly. A 600ms "•••" typing animation before the first token lands would make the chat feel more like a person and less like a demo.

- [ ] **Code:** `src/components/shared/ChatStream.tsx:188-194` (existing `<Dot />` animation runs only while placeholder content is empty — could be extended with an artificial pre-roll).
- **Suggested fix:** In `streamPatientTurn`, await 400-700ms (jittered) before opening the SSE connection. Cosmetic.
- **Effort:** S

### 📖 P-03 · [Doctor · Suggested questions] No "favorite question" or "ask all" affordance

`PatientBrief.suggested_questions_th` is a list of clickable chips. Each populates the input but doesn't send. Audience may expect a "send all three sequentially" macro.

- [ ] **Code:** `src/components/doctor/PatientBrief.tsx:92-104`.
- **Suggested fix:** Optional — add a `· ส่งทั้งหมด` link that sends the three questions one by one with a 1.2s gap. Demos AI co-pilot value-prop nicely. Probably out of scope for May 30.
- **Effort:** M

### 📖 P-04 · [Patient · Summary] Self-care tab is the default for patient but cert is more visually striking

Patient side opens to "แผนดูแลตัวเอง" (self-care) per design, but in graded demos the medical cert often photographs better. Consider swapping default tab on patient side too, or adding a flash animation that calls attention to the cert tab.

- [ ] **Code:** `src/app/patient/page.tsx:122` (`defaultTab="care"`); `src/components/shared/ConsultSummary.tsx:52`.
- **Suggested fix:** Discuss with team — purely a presentation choice.
- **Effort:** S

---

## Verified working (so we don't redo these)

These were exercised and behaved correctly. Don't waste time on them unless the surrounding code changes.

- ✅ **[Patient · Booking] Confirm button disabled on scheduled tab until a slot is picked** — `src/components/patient/BookingDialog.tsx:32`
- ✅ **[Patient · SymptomChat] Send button disabled on empty input** — `src/components/patient/SymptomChat.tsx:104`
- ✅ **[Patient · SymptomChat] HTML/script payload renders as text — no XSS** — React's default escaping is doing its job. Tested with `<script>window.__xss=true</script>` payload.
- ✅ **[Shared · Persistence] Corrupt localStorage persona JSON gracefully falls back to `DEFAULT_PERSONA`** — `src/stores/store-patient.ts:23-38`
- ✅ **[Shared · Responsive] `/`, `/patient`, `/doctor` fit a 390×844 iPhone viewport (no horizontal scroll)**
- ✅ **[Doctor · Cert] Print button is present and keyboard-focusable** — `src/components/shared/MedicalCertificate.tsx:44`
- ✅ **[Patient · Reset] `Cmd+Shift+0` mid-payment did not race in the observed run** — defensive coverage for M-04 still recommended, but the happy case is clean.
- ✅ **[Patient · BookingDialog] Closing via overlay click routes through `cancel()`** — verified via `onOpenChange` wiring at `src/components/patient/BookingDialog.tsx:45`.
- ✅ **[Patient · MockPaymentDialog] Cancel button correctly disabled during `isPaying` and `paymentSuccess`** — `src/components/patient/MockPaymentDialog.tsx:126`.
- ✅ **[Shared · LLM prompts] All five graphs (triage, match, brief, chat, summarize) import the system prompts verbatim from `prompts.ts`** — no ad-libbed string interpolation into the prompt body.
- ✅ **[Shared · Triage safety] Two-layer red-keyword safety net (pre-LLM gate + post-LLM validator)** — `src/lib/llm/graphs/triage.ts:18-89`.

---

## Suggested triage for demo prep

If you only have **one half-day**, do these in this order:

1. **C-02** (S) — shift the forecast datetimes. Without this, the schedule grid will be embarrassingly stale on May 30.
2. **C-01** (M) — scheduled booking confirmation flow.
3. **H-02** (S) — fix the end-consult guard so the patient can't accidentally end with no real chat.
4. **H-01** (S) — "วันนี้ / พรุ่งนี้" labels on the schedule grid.
5. **H-07** (S — copy fix only) — soften the misleading SMS copy.

That's ~1 day of work and removes every audience-noticeable bug we found.

If you have **a full week**:

6. **C-03** (M) — client-side fetch timeouts + `?mock=1` backup path. Pays off if Wi-Fi dies on stage.
7. **H-03** (S) — clear stream error on retry.
8. **H-04** (M) — abort in-flight streams on close/reset (kills the silent Gemini-quota burn).
9. **M-01** (S) — "this isn't an emergency" exit from the hospital screen.
10. **M-07** (S) — chat `aria-live` for screen-reader credibility.
11. **L-01** (S) — branded 404/error pages.
12. **L-02** (S) — local avatars (kills the external-dep risk).

After May 30, tackle the remaining `M-*` and `P-*` at leisure.

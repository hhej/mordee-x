// One-shot script: generate brief + mock-patient greeting + consult summary
// for each appointment in the doctor demo, then write the results into
// src/data/demo_scenarios.json under each appointment's `cached` field.
//
// Run with:  ./node_modules/.bin/tsx scripts/prebake-doctor-demo.ts
// Re-runnable, idempotent. Skips appointments already cached unless --force.

// Load .env BEFORE importing any module that reads process.env.GOOGLE_API_KEY.
process.loadEnvFile('.env');

import fs from 'node:fs';
import path from 'node:path';

const FORCE = process.argv.includes('--force');
const DEMO_PATH = path.join(process.cwd(), 'src', 'data', 'demo_scenarios.json');
const DOCTOR_ID = 'D001'; // นพ. ธนพล ใจกล้า

// 6-turn canned transcripts per scenario (doctor extracts → prescribes).
// The summarize prompt instructs the LLM to extract drugs ONLY from the
// doctor's lines — so the doctor turns explicitly include realistic Rx.
const TRANSCRIPTS: Record<string, Array<{ role: 'user' | 'assistant'; content: string }>> = {
  A001: [
    { role: 'assistant', content: 'สวัสดีค่ะคุณหมอ ดิฉันไอเรื้อรังมาเกือบ 3 สัปดาห์แล้วค่ะ ไม่มีไข้ แต่มีเสมหะใส ๆ' },
    { role: 'user', content: 'สวัสดีครับคุณมะลิ มีอาการอื่นร่วมด้วยไหมครับ เช่น เจ็บคอ คัดจมูก หรือหอบเหนื่อย' },
    { role: 'assistant', content: 'ตอนกลางคืนจะไอมากค่ะ บางครั้งคัดจมูกเล็กน้อย ไม่หอบเหนื่อยค่ะ' },
    { role: 'user', content: 'มีประวัติแพ้อะไรไหมครับ และที่บ้านมีฝุ่นเยอะหรือเลี้ยงสัตว์ไหม' },
    { role: 'assistant', content: 'ดิฉันแพ้ฝุ่นเล็กน้อยค่ะ ที่ทำงานมีฝุ่นเยอะ ไม่ได้เลี้ยงสัตว์' },
    { role: 'user', content: 'น่าจะเป็นภูมิแพ้ทางเดินหายใจส่วนบนครับ ผมจะให้ loratadine 10mg ทาน 1 เม็ดก่อนนอน 7 วัน และ guaifenesin 200mg ทาน 1 เม็ดทุก 8 ชั่วโมงเวลามีเสมหะ ใส่หน้ากากเวลาทำงานนะครับ ถ้าไม่ดีขึ้นใน 7 วัน ให้กลับมาพบหมอนะครับ' },
    { role: 'assistant', content: 'ขอบคุณค่ะคุณหมอ' },
  ],
  A002: [
    { role: 'assistant', content: 'สวัสดีครับคุณหมอ ผมปวดเข่าขวามาประมาณ 2 สัปดาห์แล้ว ปวดมากเวลาขึ้นบันได' },
    { role: 'user', content: 'สวัสดีครับคุณสมชาย เข่ามีบวม แดง หรือร้อนผิดปกติไหมครับ' },
    { role: 'assistant', content: 'ไม่บวมแดงครับ แต่รู้สึกตึง ๆ ตอนเช้า พอเดินไปสักพักก็ดีขึ้น' },
    { role: 'user', content: 'มีประวัติเคยบาดเจ็บที่เข่าไหมครับ และน้ำหนักตัวเท่าไรครับ' },
    { role: 'assistant', content: 'ไม่เคยบาดเจ็บครับ น้ำหนัก 82 กิโล สูง 170 ครับ ทาน amlodipine ความดันอยู่ครับ' },
    { role: 'user', content: 'น่าจะเป็นข้อเข่าเสื่อมระยะเริ่มต้นครับ ผมจะให้ naproxen 250mg ทานหลังอาหาร 1 เม็ด เช้า-เย็น 7 วัน ลดน้ำหนักลง 3-5 กิโล และเลี่ยงการขึ้นบันไดบ่อย ทำกายภาพเบา ๆ นะครับ นัดมาตรวจซ้ำใน 2 สัปดาห์ครับ' },
    { role: 'assistant', content: 'ขอบคุณครับคุณหมอ' },
  ],
  A003: [
    { role: 'assistant', content: 'สวัสดีค่ะคุณหมอ มาตรวจสุขภาพประจำปีค่ะ ช่วงนี้รู้สึกอ่อนเพลียบ่อยด้วย' },
    { role: 'user', content: 'สวัสดีครับคุณวันดี อ่อนเพลียมานานเท่าไรครับ มีน้ำหนักลด นอนไม่หลับ หรือกระหายน้ำบ่อยไหม' },
    { role: 'assistant', content: 'ประมาณเดือนกว่าค่ะ ไม่ได้ลดน้ำหนัก แต่กระหายน้ำบ่อยขึ้น เข้าห้องน้ำกลางคืนหลายรอบ' },
    { role: 'user', content: 'ในครอบครัวมีคนเป็นเบาหวานไหมครับ' },
    { role: 'assistant', content: 'แม่เป็นค่ะ พี่ชายก็เป็นเหมือนกัน ดิฉันไม่ค่อยได้ออกกำลังกายค่ะ' },
    { role: 'user', content: 'มีความเสี่ยงเบาหวานสูงครับ ผมจะส่งตรวจ fasting blood sugar และ HbA1c ระหว่างรอผล ให้ลดของหวาน เพิ่มผัก ออกกำลังกาย 30 นาที 5 วันต่อสัปดาห์ครับ นัดฟังผลใน 7 วันครับ' },
    { role: 'assistant', content: 'ขอบคุณค่ะคุณหมอ' },
  ],
};

async function main() {
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY not set. Add it to .env and rerun.');
    process.exit(1);
  }

  // Dynamic imports so they happen AFTER loadEnvFile.
  const [{ SystemMessage, HumanMessage }, { chatModel }, { systemMockPatient }, briefMod, summarizeMod, dataMod] =
    await Promise.all([
      import('@langchain/core/messages'),
      import('../src/lib/llm/client'),
      import('../src/lib/llm/prompts'),
      import('../src/lib/llm/graphs/brief'),
      import('../src/lib/llm/graphs/summarize'),
      import('../src/lib/data'),
    ]);
  const { runBrief } = briefMod;
  const { runSummarize } = summarizeMod;
  const { getDoctor } = dataMod;

  const raw = fs.readFileSync(DEMO_PATH, 'utf-8');
  const doc = JSON.parse(raw) as {
    patient_demos: unknown[];
    doctor_demo: {
      id: string;
      doctor_id: string;
      today_appointments: Array<{
        appt_id: string;
        patient: string;
        time: string;
        symptom: string;
        prediction_id: string;
        profile?: {
          age: number;
          gender: 'male' | 'female';
          history: string;
          triage: 'green' | 'yellow' | 'red';
        };
        cached?: unknown;
      }>;
    };
  };

  const appts = doc.doctor_demo.today_appointments;
  console.log(`📋 baking ${appts.length} appointments${FORCE ? ' (FORCE)' : ''}`);

  for (const appt of appts) {
    const profile = appt.profile;
    if (!profile) {
      console.warn(`⚠️  ${appt.appt_id}: missing profile, skipping`);
      continue;
    }
    if (appt.cached && !FORCE) {
      console.log(`⏭   ${appt.appt_id}: already cached (use --force to refresh)`);
      continue;
    }

    console.log(`🔧 ${appt.appt_id} (${appt.patient}): brief…`);
    const brief = await runBrief({
      patient_name: appt.patient,
      age: profile.age,
      gender: profile.gender,
      symptom_text: appt.symptom,
      triage: profile.triage,
      history: profile.history,
    });

    console.log(`🔧 ${appt.appt_id}: greeting…`);
    const doctor = getDoctor(DOCTOR_ID)!;
    const greetingLlm = chatModel({ temperature: 0.6 });
    const greetingSystem = systemMockPatient(
      { name: doctor.name, specialty_th: doctor.specialty_th },
      { name: appt.patient, age: profile.age },
      `${appt.symptom} · ${profile.history} · brief: ${brief.one_liner}`,
    );
    const trigger = 'เริ่มการสนทนาด้วยการทักทายแพทย์สั้น ๆ 1 ประโยค พร้อมเล่าอาการหลักของคุณแบบสั้น (ไม่เกิน 30 คำ).';
    const greetRes = await greetingLlm.invoke([
      new SystemMessage(greetingSystem),
      new HumanMessage(trigger),
    ]);
    const greeting = (typeof greetRes.content === 'string' ? greetRes.content : '').trim();

    console.log(`🔧 ${appt.appt_id}: summary…`);
    const transcript = TRANSCRIPTS[appt.appt_id];
    if (!transcript) throw new Error(`No canned transcript for ${appt.appt_id}`);
    const summary = await runSummarize({
      transcript,
      patient_name: appt.patient,
      doctor_id: DOCTOR_ID,
    });

    appt.cached = { brief, greeting, summary };
    console.log(
      `✅ ${appt.appt_id}: baked (${brief.ddx.length} ddx · ${summary.self_care_plan.medications.length} meds)`,
    );
  }

  fs.writeFileSync(DEMO_PATH, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
  console.log(`\n💾 wrote ${DEMO_PATH}`);
}

main().catch((err) => {
  console.error('❌ prebake failed:', err);
  process.exit(1);
});

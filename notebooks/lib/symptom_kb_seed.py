"""Symptom knowledge-base seed for MorDee+ RAG (notebook 03 populates embeddings).

50 entries covering Thai-relevant chief complaints across body systems.
Severity mix: ~15 red, ~20 yellow, ~15 green. Anchored so:
  - PD01 (gastroenteritis demo) → YELLOW retrieval target → S013
  - PD02 (chest pain demo) → RED retrieval target → S001
  - PD03 (mild headache demo) → GREEN retrieval target → S036

Citation sources used in the `source` field of individual entries:
  - MTS — Manchester Triage System flowcharts (TriageIQ refs)
    https://blog.triageiq.com/understanding-the-manchester-triage-system
  - Thai ACS Guidelines 2020 (Thai Heart Association)
    https://thaiheart.org/wcontent/content/thai-acs-guidelines-2020
  - WHO 2009 Dengue Classification (warning signs vs severe)
    https://pmc.ncbi.nlm.nih.gov/articles/PMC4736485/
  - RCPT 2024 Dyslipidemia / ACVD CPG
    https://pmc.ncbi.nlm.nih.gov/articles/PMC11650434/
  - WHO Thailand dengue advisories
    https://www.who.int/thailand/news/detail/30-06-2023-combating-dengue-outbreak-...
"""

from __future__ import annotations

KB_ENTRIES: list[dict] = [
    # ── RED — immediate ER / call 1669 ────────────────────────────────────
    {
        "id": "S001",
        "title": "Crushing chest pain with shortness of breath, sweating",
        "title_th": "เจ็บแน่นหน้าอก ร้าวไปแขนซ้าย หายใจลำบาก เหงื่อแตก",
        "severity": "red",
        "guidance_th": "หยุดทุกกิจกรรมและโทร 1669 ทันที หรือเดินทางไป ER ใกล้บ้านโดยมีคนพาไป "
                        "ห้ามขับรถเอง เคี้ยวแอสไพริน 162-325 mg หากไม่แพ้ อาการนี้เป็นสัญญาณของ "
                        "ภาวะหัวใจขาดเลือดเฉียบพลัน (Acute Coronary Syndrome) ตามแนวทาง Thai ACS 2020",
        "guidance_en": "Stop all activity and call 1669 immediately, or have someone drive you "
                        "to the nearest ER. Do NOT drive yourself. Chew 162-325 mg aspirin if not "
                        "allergic. This presentation indicates acute coronary syndrome per Thai ACS 2020.",
        "specialty_hint": "Cardiology",
        "source": "Thai Heart Association · Thai ACS Guidelines 2020",
    },
    {
        "id": "S002",
        "title": "Sudden severe headache (thunderclap)",
        "title_th": "ปวดหัวรุนแรงเฉียบพลันที่สุดในชีวิต ปวดทันทีภายในวินาที",
        "severity": "red",
        "guidance_th": "โทร 1669 หรือไป ER ทันที อาการปวดหัวรุนแรงแบบฟ้าผ่าอาจเป็นเลือดออกใต้เยื่อหุ้มสมอง "
                        "(subarachnoid hemorrhage) ต้องทำ CT brain ภายใน 1 ชั่วโมง",
        "guidance_en": "Call 1669 or go to ER immediately. A 'worst headache of life' that peaks "
                        "within seconds suggests subarachnoid hemorrhage; needs CT brain within 1 hour.",
        "specialty_hint": "Neurology",
        "source": "Manchester Triage System — Headache flowchart",
    },
    {
        "id": "S003",
        "title": "Stroke symptoms (FAST: face droop, arm weakness, speech)",
        "title_th": "หน้าเบี้ยว แขนขาอ่อนแรงข้างเดียว พูดไม่ชัด มองเห็นเปลี่ยน",
        "severity": "red",
        "guidance_th": "โทร 1669 ทันที — Time is brain. ทุกๆ นาทีของการรอเสียเซลล์สมองล้านเซลล์ "
                        "ระยะเวลาทอง 4.5 ชั่วโมงสำหรับ tPA จดเวลาที่อาการเริ่ม",
        "guidance_en": "Call 1669 immediately. Every minute lost = 1.9M neurons. Note the exact "
                        "onset time — 4.5-hour window for thrombolysis. Do not give food/water.",
        "specialty_hint": "Neurology",
        "source": "AHA Stroke Guidelines · Thai stroke protocol",
    },
    {
        "id": "S004",
        "title": "Severe shortness of breath at rest",
        "title_th": "หายใจไม่ทันแม้นั่งนิ่งๆ ริมฝีปากเขียว",
        "severity": "red",
        "guidance_th": "โทร 1669 ทันที อาการหายใจหอบที่นั่งเฉยๆ ก็เหนื่อย และริมฝีปากเขียวบ่งบอกถึง "
                        "ภาวะ hypoxemia รุนแรง อาจเป็นภาวะหัวใจล้มเหลวเฉียบพลัน หรือ pulmonary embolism",
        "guidance_en": "Call 1669 immediately. Cyanosis + dyspnea at rest indicates severe hypoxemia. "
                        "Could be acute heart failure, pulmonary embolism, severe pneumonia.",
        "specialty_hint": "Pulmonology",
        "source": "Manchester Triage System — Shortness of breath",
    },
    {
        "id": "S005",
        "title": "Severe abdominal pain with rigid abdomen",
        "title_th": "ปวดท้องรุนแรง ท้องแข็งเกร็งกดเจ็บมาก เป็นไข้สูง",
        "severity": "red",
        "guidance_th": "ไป ER ทันที — ภาวะ peritonitis อาจเกิดจากไส้ติ่งแตก กระเพาะทะลุ หรือลำไส้ทะลุ "
                        "ห้ามรับประทานอาหาร น้ำ หรือยาแก้ปวดเอง",
        "guidance_en": "Go to ER now. Rigid abdomen with severe pain suggests peritonitis — "
                        "perforated viscus, ruptured appendix, mesenteric ischemia. NPO; no self-medication.",
        "specialty_hint": "Gastroenterology",
        "source": "Manchester Triage System — Abdominal pain in adults",
    },
    {
        "id": "S006",
        "title": "Massive GI bleed / hematemesis",
        "title_th": "อาเจียนเป็นเลือดสด ๆ จำนวนมาก ใจสั่น หน้ามืด",
        "severity": "red",
        "guidance_th": "โทร 1669 ทันที — เสี่ยง hemorrhagic shock ผู้ป่วยตับแข็งที่อาเจียนเลือด "
                        "อาจมี variceal bleeding ต้อง ICU + endoscopy ฉุกเฉิน",
        "guidance_en": "Call 1669. Hematemesis with tachycardia and dizziness indicates hemorrhagic "
                        "shock risk — variceal bleed in cirrhotic patients needs urgent EGD and ICU.",
        "specialty_hint": "Gastroenterology",
        "source": "Manchester Triage System — GI bleed",
    },
    {
        "id": "S007",
        "title": "Severe acute asthma attack (cannot speak in sentences)",
        "title_th": "หอบหืดกำเริบรุนแรง พูดเป็นประโยคไม่ได้ ใช้พ่นยาแล้วไม่ดีขึ้น",
        "severity": "red",
        "guidance_th": "ไป ER หรือโทร 1669 ทันที พ่นยา salbutamol ทุก 20 นาที 3 ครั้ง ขณะรอ "
                        "หากไม่ดีขึ้นต้องรับ steroid systemic + nebulizer",
        "guidance_en": "Go to ER or call 1669. Severe asthma exacerbation (inability to speak in "
                        "sentences) needs nebulized salbutamol q20min + systemic steroids.",
        "specialty_hint": "Pulmonology",
        "source": "GINA Asthma Strategy 2024",
    },
    {
        "id": "S008",
        "title": "Anaphylaxis (face swelling, hives, breathing trouble)",
        "title_th": "หน้าและริมฝีปากบวม ผื่นลมพิษทั่วตัว หายใจลำบาก เสียงแหบ",
        "severity": "red",
        "guidance_th": "ฉีด adrenaline IM 0.3-0.5 mg ทันทีหากมี EpiPen แล้วโทร 1669 "
                        "ถ้าไม่มียา อย่ารอ — ไป ER ที่ใกล้ที่สุด อาจเสียชีวิตภายใน 30 นาที",
        "guidance_en": "Inject IM adrenaline (0.3-0.5 mg) immediately if EpiPen available, then "
                        "call 1669. Without epi, go to ER now — anaphylaxis can be fatal within 30 min.",
        "specialty_hint": "Allergy & Immunology",
        "source": "World Allergy Organization Anaphylaxis Guidelines 2020",
    },
    {
        "id": "S009",
        "title": "Suspected meningitis (fever, stiff neck, photophobia)",
        "title_th": "ไข้สูง ปวดหัวรุนแรง คอแข็ง สู้แสงไม่ได้ มีผื่นจุดเลือดออก",
        "severity": "red",
        "guidance_th": "ไป ER ทันที — สงสัย bacterial meningitis ต้องตรวจน้ำไขสันหลังและให้ ceftriaxone "
                        "ภายใน 1 ชั่วโมง ผื่น petechial = meningococcemia เสี่ยงสูง",
        "guidance_en": "Go to ER now. Suspected bacterial meningitis needs LP + IV ceftriaxone "
                        "within 1 hour. Petechial rash = meningococcemia, high mortality if delayed.",
        "specialty_hint": "Internal Medicine",
        "source": "Manchester Triage System — Headache + fever",
    },
    {
        "id": "S010",
        "title": "Active seizure / convulsion",
        "title_th": "ชักเกร็งกระตุก ไม่รู้สึกตัว ชักเกิน 5 นาที",
        "severity": "red",
        "guidance_th": "โทร 1669 ทันที จับเวลาที่ชัก — เกิน 5 นาทีถือว่า status epilepticus "
                        "ห้ามใส่อะไรในปาก พลิกตะแคงเพื่อกันสำลัก",
        "guidance_en": "Call 1669. Time the seizure — >5 min = status epilepticus, neurologic "
                        "emergency. Do NOT put anything in the mouth. Turn on side for airway.",
        "specialty_hint": "Neurology",
        "source": "Manchester Triage System — Convulsions",
    },
    {
        "id": "S011",
        "title": "Suicidal ideation with active plan",
        "title_th": "มีความคิดทำร้ายตนเอง วางแผนแล้ว มีวิธีและเครื่องมือ",
        "severity": "red",
        "guidance_th": "โทรสายด่วนสุขภาพจิต 1323 ทันที หรือไป ER ใกล้บ้าน ขอให้คนใกล้ชิดอยู่เป็นเพื่อน "
                        "เก็บอุปกรณ์ที่อันตรายออกจากบ้าน ห้ามอยู่คนเดียว",
        "guidance_en": "Call mental-health hotline 1323 now or go to ER. Ask a close person to "
                        "stay with you. Remove dangerous items from home. Do not be alone.",
        "specialty_hint": "Psychiatry",
        "source": "Thai Department of Mental Health · suicide-risk protocol",
    },
    {
        "id": "S012",
        "title": "Acute psychosis with violence risk",
        "title_th": "หูแว่ว ภาพหลอน อาการเปลี่ยนเฉียบพลัน ก้าวร้าวกับคนรอบข้าง",
        "severity": "red",
        "guidance_th": "โทร 1669 หรือสายด่วน 1323 หากผู้ป่วยมีความเสี่ยงทำร้ายตนเองหรือผู้อื่น "
                        "ต้องรับการประเมินที่ ER จิตเวช ห้ามเผชิญหน้าหรือกักขัง",
        "guidance_en": "Call 1669 or 1323 if the patient is a risk to self or others. Needs ER "
                        "psychiatric evaluation. Do not confront or restrain. Wait for trained help.",
        "specialty_hint": "Psychiatry",
        "source": "Manchester Triage System — Mental health emergency",
    },
    {
        "id": "S013",
        "title": "Pregnancy with vaginal bleeding and abdominal pain",
        "title_th": "ตั้งครรภ์ มีเลือดออกทางช่องคลอด ปวดท้องน้อย",
        "severity": "red",
        "guidance_th": "ไป ER สูตินรีเวชทันที — เสี่ยง ectopic pregnancy หรือ placental abruption "
                        "ต้อง ultrasound + CBC + Rh ฉุกเฉิน",
        "guidance_en": "Go to OB ER immediately. Risk of ectopic pregnancy or placental abruption — "
                        "needs urgent US, CBC, Rh type. Bleeding in pregnancy is never normal.",
        "specialty_hint": "OB-GYN",
        "source": "ACOG Practice Bulletin · ectopic & abruption",
    },
    {
        "id": "S014",
        "title": "Pediatric high fever with lethargy or petechiae",
        "title_th": "เด็กไข้สูงเกิน 39°C ซึม ไม่เล่น ปลุกยาก หรือมีผื่นจุดเลือดออก",
        "severity": "red",
        "guidance_th": "ไป ER เด็กทันที — สงสัย sepsis/meningococcemia เด็กที่ซึมและไม่ตอบสนอง "
                        "มีความเสี่ยงสูงต้องตรวจเลือดและให้ยาฆ่าเชื้อทันที",
        "guidance_en": "Go to pediatric ER now. Suspected sepsis or meningococcemia. A lethargic "
                        "febrile child needs urgent labs + empiric antibiotics within 1 hour.",
        "specialty_hint": "Pediatrics",
        "source": "Manchester Triage System — Pediatric fever; NICE NG143",
    },
    {
        "id": "S015",
        "title": "Dengue with warning signs (per WHO 2009)",
        "title_th": "ไข้เลือดออก: ปวดท้องรุนแรง อาเจียนต่อเนื่อง เลือดออกตามจมูก เหงือก ซึม",
        "severity": "red",
        "guidance_th": "ไป ER ทันที — WHO 2009 warning signs (severe abdominal pain, persistent "
                        "vomiting, bleeding, lethargy, hepatomegaly) บ่งบอกว่ากำลังเข้าสู่ severe dengue "
                        "ต้องให้ IV fluid ตามแนวทาง WHO และ monitor Hct + platelet",
        "guidance_en": "Go to ER now. WHO 2009 warning signs (severe abdominal pain, persistent "
                        "vomiting, mucosal bleed, lethargy, hepatomegaly) indicate severe dengue risk. "
                        "Needs IV fluids per WHO protocol + Hct/platelet monitoring.",
        "specialty_hint": "Internal Medicine",
        "source": "WHO 2009 Dengue Classification · Thai MOPH dengue protocol",
    },

    # ── YELLOW — telemed within 24h ────────────────────────────────────
    {
        "id": "S016",
        "title": "Gastroenteritis with low-grade fever (2 days)",
        "title_th": "ปวดท้องน้อย ท้องเสีย 2 วัน ไข้ต่ำ ๆ คลื่นไส้",
        "severity": "yellow",
        "guidance_th": "ปรึกษาแพทย์ telemed ภายใน 24 ชม. ดื่ม ORS เป็นจิบๆ ระวังภาวะขาดน้ำ "
                        "ถ้าถ่ายเป็นเลือด อาเจียนหนัก หรือไข้สูงเกิน 39°C ให้ไป ER ทันที",
        "guidance_en": "Schedule telemed consult within 24h. Sip ORS frequently; watch for dehydration. "
                        "If bloody stool, severe vomiting, or fever >39°C — go to ER immediately.",
        "specialty_hint": "Internal Medicine",
        "source": "WHO ORS protocol · MTS Diarrhea & vomiting flowchart",
    },
    {
        "id": "S017",
        "title": "Persistent cough >2 weeks (possible TB)",
        "title_th": "ไอเรื้อรังเกิน 2 สัปดาห์ มีเสมหะ น้ำหนักลด เหงื่อออกกลางคืน",
        "severity": "yellow",
        "guidance_th": "ปรึกษาแพทย์ภายใน 1-2 วัน — ต้องตัด TB ออกด้วย CXR + AFB smear ใส่หน้ากากเสมอ "
                        "เลี่ยงคนสูงวัย/เด็กเล็กจนได้รับการประเมิน",
        "guidance_en": "Schedule consult within 1-2 days. Rule out TB with CXR + AFB smear. "
                        "Wear a surgical mask, avoid close contact with elderly/children until cleared.",
        "specialty_hint": "Pulmonology",
        "source": "Thai TB Programme · MOPH 2024",
    },
    {
        "id": "S018",
        "title": "New high blood pressure with headache",
        "title_th": "วัดความดันได้ >160/100 mmHg มีอาการปวดหัว คลื่นไส้",
        "severity": "yellow",
        "guidance_th": "ปรึกษาแพทย์ภายในวันเดียว ถ้า BP >180/120 หรือมี blurred vision ให้ไป ER "
                        "นอนพักนิ่ง ลดเครื่องดื่ม caffeine โซเดียม",
        "guidance_en": "Telemed consult same day. If BP >180/120 or vision changes, go to ER "
                        "(hypertensive emergency). Rest quietly, reduce caffeine and sodium.",
        "specialty_hint": "Internal Medicine",
        "source": "RCPT Hypertension CPG · 2023",
    },
    {
        "id": "S019",
        "title": "Diabetic foot ulcer / infected wound",
        "title_th": "เป็นเบาหวาน มีแผลที่เท้าไม่หาย บวม แดง มีหนอง",
        "severity": "yellow",
        "guidance_th": "ปรึกษาแพทย์ภายใน 24 ชม. — แผลเบาหวานติดเชื้อเสี่ยง osteomyelitis และตัดขา "
                        "ทำแผลด้วยน้ำเกลือ ห้ามใช้แอลกอฮอล์หรือ povidone จัด ๆ ที่แผล",
        "guidance_en": "Consult within 24h. Diabetic ulcer infection risks osteomyelitis & amputation. "
                        "Clean with normal saline only — avoid alcohol/povidone on open ulcers.",
        "specialty_hint": "Endocrinology",
        "source": "IDF Diabetic Foot Guidelines 2023",
    },
    {
        "id": "S020",
        "title": "UTI symptoms (dysuria, frequency)",
        "title_th": "ปัสสาวะแสบขัด บ่อย กลั้นไม่อยู่ ปวดท้องน้อย",
        "severity": "yellow",
        "guidance_th": "ปรึกษาแพทย์ทาง telemed วันนี้ ดื่มน้ำมาก ๆ หลีกเลี่ยงการกลั้น "
                        "ถ้ามีไข้สูง ปวดบั้นเอว ปัสสาวะเป็นเลือด — ไป ER (pyelonephritis)",
        "guidance_en": "Telemed consult today. Increase water intake; do not hold urine. "
                        "Fever + flank pain + hematuria = suspected pyelonephritis → ER.",
        "specialty_hint": "Urology",
        "source": "IDSA Uncomplicated UTI Guidelines 2010",
    },
    {
        "id": "S021",
        "title": "Pelvic pain in non-pregnant adult",
        "title_th": "ปวดท้องน้อยในผู้หญิงที่ไม่ได้ตั้งครรภ์ ตกขาวผิดปกติ",
        "severity": "yellow",
        "guidance_th": "ปรึกษาสูตินรีเวชภายใน 1-2 วัน — เสี่ยง PID หรือ ovarian torsion "
                        "ถ้าปวดเฉียบพลันรุนแรงและมีไข้ ให้ไป ER",
        "guidance_en": "Consult OB-GYN within 1-2 days. Rule out PID or ovarian torsion. "
                        "Severe acute pain + fever → ER.",
        "specialty_hint": "OB-GYN",
        "source": "CDC PID Treatment Guidelines 2021",
    },
    {
        "id": "S022",
        "title": "Persistent diarrhea with dehydration signs",
        "title_th": "ท้องเสียเกิน 3 วัน ปัสสาวะน้อย ปากแห้ง อ่อนเพลีย",
        "severity": "yellow",
        "guidance_th": "ปรึกษาแพทย์วันนี้ + ดื่ม ORS อย่างต่อเนื่อง หากปัสสาวะไม่ออกใน 8 ชม. "
                        "หรือซึม สับสน — ไป ER เพื่อรับสารน้ำทางหลอดเลือด",
        "guidance_en": "Consult today + continuous ORS. If no urine output in 8h or confusion — "
                        "ER for IV fluids.",
        "specialty_hint": "Internal Medicine",
        "source": "WHO Diarrhea Management 2022",
    },
    {
        "id": "S023",
        "title": "Acute lower back pain after lifting injury",
        "title_th": "ปวดหลังเฉียบพลันหลังยกของหนัก ปวดร้าวลงขา",
        "severity": "yellow",
        "guidance_th": "ปรึกษา ortho ภายใน 1-2 วัน ประคบเย็น 20 นาที 3 ครั้ง/วัน "
                        "ถ้าควบคุมการปัสสาวะ/อุจจาระไม่ได้ หรือชาที่ก้น — ER ทันที (cauda equina)",
        "guidance_en": "Consult Ortho within 1-2 days. Ice 20 min × 3/day. Bowel/bladder loss or "
                        "saddle anesthesia → ER NOW (cauda equina syndrome).",
        "specialty_hint": "Orthopedics",
        "source": "NICE Low Back Pain Guideline NG59",
    },
    {
        "id": "S024",
        "title": "Severe sore throat with high fever",
        "title_th": "เจ็บคอมาก กลืนน้ำลายไม่ได้ ไข้สูงเกิน 39°C ต่อมน้ำเหลืองโต",
        "severity": "yellow",
        "guidance_th": "ปรึกษา ENT ภายใน 24 ชม. — สงสัย streptococcal pharyngitis หรือ peritonsillar abscess "
                        "ถ้าหายใจลำบาก น้ำลายฟูม — ไป ER (epiglottitis)",
        "guidance_en": "ENT consult within 24h. Suspect strep or peritonsillar abscess. "
                        "Drooling + stridor → ER (epiglottitis).",
        "specialty_hint": "ENT",
        "source": "IDSA Group A Strep Pharyngitis 2012",
    },
    {
        "id": "S025",
        "title": "Acute otitis media (ear pain in child)",
        "title_th": "เด็กปวดหู ดึงหูเอง มีไข้ ร้องไห้กลางคืน",
        "severity": "yellow",
        "guidance_th": "ปรึกษากุมารแพทย์ภายใน 24 ชม. ให้ paracetamol เพื่อบรรเทาปวด "
                        "ถ้ามีหนองไหลออกจากหู หรือไข้สูงไม่ลด — พบแพทย์เร็วขึ้น",
        "guidance_en": "Pediatric consult within 24h. Give paracetamol for pain. "
                        "Otorrhea or persistent high fever → see sooner.",
        "specialty_hint": "Pediatrics",
        "source": "AAP Otitis Media Clinical Practice Guideline",
    },
    {
        "id": "S026",
        "title": "Moderate asthma exacerbation",
        "title_th": "หอบหืดกำเริบ ใช้ inhaler แล้วดีขึ้นบ้าง ยังเหนื่อยอยู่บ้าง",
        "severity": "yellow",
        "guidance_th": "ปรึกษาแพทย์ telemed ภายใน 24 ชม. ใช้ salbutamol ตามที่แพทย์สั่ง "
                        "หากต้องพ่นยาทุก 4 ชม. ขึ้นไป หรือพูดเป็นประโยคไม่ได้ — ER",
        "guidance_en": "Telemed consult within 24h. Continue prescribed salbutamol. "
                        "Needing it q4h or unable to speak in sentences → ER.",
        "specialty_hint": "Pulmonology",
        "source": "GINA Asthma Strategy 2024",
    },
    {
        "id": "S027",
        "title": "Acute conjunctivitis (red eye, discharge)",
        "title_th": "ตาแดง ขี้ตาเยอะ เคืองตา รู้สึกเหมือนมีอะไรในตา",
        "severity": "yellow",
        "guidance_th": "ปรึกษาแพทย์ telemed ภายใน 1-2 วัน ล้างตาด้วยน้ำเกลือ ไม่ใส่ contact lens "
                        "ถ้าตามัวลง หรือปวดตามาก — ER (rule out keratitis)",
        "guidance_en": "Telemed consult within 1-2 days. Saline rinse, no contact lenses. "
                        "Decreased vision or severe pain → ER to rule out keratitis.",
        "specialty_hint": "General Practice",
        "source": "AAO Preferred Practice Pattern · Conjunctivitis 2018",
    },
    {
        "id": "S028",
        "title": "Skin rash with fever (suspected dengue or viral)",
        "title_th": "ผื่นแดงทั้งตัว มีไข้สูง 38-39°C ปวดเมื่อยกล้ามเนื้อ ปวดข้อ",
        "severity": "yellow",
        "guidance_th": "ปรึกษาแพทย์วันเดียว — ในไทยช่วงหน้าฝน (มิ.ย.-ต.ค.) สงสัยไข้เลือดออกเสมอ "
                        "ห้ามใช้ aspirin หรือ NSAIDs ใช้ paracetamol และดื่มน้ำมาก ๆ ติดตาม warning signs",
        "guidance_en": "Same-day consult. In Thai monsoon (Jun-Oct), always consider dengue. "
                        "Avoid aspirin/NSAIDs — use paracetamol only. Watch WHO warning signs.",
        "specialty_hint": "Internal Medicine",
        "source": "WHO 2009 Dengue Classification · Thai MOPH 2024 advisory",
    },
    {
        "id": "S029",
        "title": "Pediatric fever 38-39°C without other symptoms",
        "title_th": "เด็กไข้ 38-39°C เล่นได้บ้าง กินอาหารได้บ้าง",
        "severity": "yellow",
        "guidance_th": "ปรึกษากุมารแพทย์ภายใน 24 ชม. เช็ดตัวลดไข้ ให้ paracetamol ตามน้ำหนัก "
                        "ถ้าซึม ไม่กิน หรือไข้ลดยากเกิน 48 ชม. — พบแพทย์",
        "guidance_en": "Pediatric consult within 24h. Tepid sponge, paracetamol by weight. "
                        "Lethargy, refusing fluids, or fever >48h → see doctor.",
        "specialty_hint": "Pediatrics",
        "source": "AAP febrile child guidance",
    },
    {
        "id": "S030",
        "title": "Pediatric vomiting with dehydration risk",
        "title_th": "เด็กอาเจียนต่อเนื่อง 6-12 ชม. ไม่ยอมดื่มน้ำ ปัสสาวะลดลง",
        "severity": "yellow",
        "guidance_th": "ปรึกษากุมารแพทย์วันนี้ ให้ ORS ทีละน้อย (5 ml ทุก 5 นาที) "
                        "ถ้าซึม กระหม่อมยุบ ปัสสาวะไม่ออก — ER เพื่อรับสารน้ำทางหลอดเลือด",
        "guidance_en": "Pediatric consult today. Small frequent ORS (5 ml q5min). "
                        "Lethargy, sunken fontanelle, no urine → ER for IV fluids.",
        "specialty_hint": "Pediatrics",
        "source": "WHO IMCI · Pediatric dehydration",
    },
    {
        "id": "S031",
        "title": "Acute joint pain with swelling (suspect gout)",
        "title_th": "ข้อบวมแดงร้อน ปวดมากที่นิ้วเท้าหรือเข่า เริ่มกลางคืน",
        "severity": "yellow",
        "guidance_th": "ปรึกษา ortho ภายใน 1-2 วัน ยกเท้าสูง ประคบเย็น ใช้ NSAID หากไม่มีข้อห้าม "
                        "ถ้าไข้สูงร่วม — ER เพื่อแยก septic arthritis",
        "guidance_en": "Ortho consult within 1-2 days. Elevate, ice, NSAID if no contraindication. "
                        "High fever + joint pain → ER (rule out septic arthritis).",
        "specialty_hint": "Orthopedics",
        "source": "ACR Gout Management Guideline 2020",
    },
    {
        "id": "S032",
        "title": "Postpartum check / breastfeeding concerns",
        "title_th": "หลังคลอด มีปัญหาให้นม น้ำคาวปลายังออก ปวดเต้านม",
        "severity": "yellow",
        "guidance_th": "ปรึกษาสูตินรีเวช/พยาบาลผดุงครรภ์ ภายใน 24 ชม. นวดเต้านม ดูดนมบ่อย ๆ "
                        "ถ้าไข้สูง เต้านมแดงร้อน — รักษา mastitis ด้วยยาฆ่าเชื้อ",
        "guidance_en": "OB consult within 24h. Massage, frequent feeding. Fever + breast erythema "
                        "= mastitis → needs antibiotics.",
        "specialty_hint": "OB-GYN",
        "source": "ABM Mastitis Protocol 2022",
    },
    {
        "id": "S033",
        "title": "Acute panic attack with chest tightness",
        "title_th": "ใจสั่น หายใจเร็ว ตัวชา เวียนหัว กลัวจะเสียชีวิต อาการเป็น 10-30 นาที",
        "severity": "yellow",
        "guidance_th": "ปรึกษาจิตแพทย์ telemed ภายใน 24 ชม. หายใจช้าๆ 4-7-8 technique "
                        "ถ้าเป็นครั้งแรกหรือเจ็บอกร้าวร่วม — ER เพื่อแยกหัวใจ",
        "guidance_en": "Psych telemed within 24h. Use 4-7-8 breathing. First episode or chest "
                        "pain with radiation → ER first to rule out cardiac.",
        "specialty_hint": "Psychiatry",
        "source": "APA Panic Disorder Treatment Guideline",
    },
    {
        "id": "S034",
        "title": "Severe recurrent migraine",
        "title_th": "ปวดหัวข้างเดียวรุนแรง คลื่นไส้ อ่อนต่อแสง เป็น ๆ หาย ๆ",
        "severity": "yellow",
        "guidance_th": "ปรึกษา neuro ภายใน 1-2 วัน ลดแสงและเสียง พักในที่มืด "
                        "ใช้ triptan หากแพทย์เคยสั่ง — ถ้าเปลี่ยนรูปแบบเดิม / ผิดปกติ — ER",
        "guidance_en": "Neuro consult within 1-2 days. Dark, quiet room. Triptan if previously "
                        "prescribed. New pattern / atypical features → ER.",
        "specialty_hint": "Neurology",
        "source": "AAN Migraine Treatment Guidelines",
    },
    {
        "id": "S035",
        "title": "Allergic rash with mild breathing tightness",
        "title_th": "ผื่นลมพิษทั่วตัวหลังกินอาหาร/ยา รู้สึกแน่นหน้าอกเล็กน้อย",
        "severity": "yellow",
        "guidance_th": "ปรึกษาแพทย์ภูมิแพ้วันนี้ กิน antihistamine (loratadine 10 mg) "
                        "หากแน่นหน้าอกมากขึ้น หรือเสียงแหบ — ER ทันที (เสี่ยง anaphylaxis)",
        "guidance_en": "Allergy consult today. Take antihistamine (loratadine 10 mg). "
                        "Worsening chest tightness or hoarse voice → ER (anaphylaxis risk).",
        "specialty_hint": "Allergy & Immunology",
        "source": "WAO Urticaria Guidelines 2022",
    },

    # ── GREEN — routine / self-care ────────────────────────────────────
    {
        "id": "S036",
        "title": "Mild tension headache from stress",
        "title_th": "ปวดหัวเล็กน้อยจากความเครียด นอนน้อย อาการไม่รุนแรง",
        "severity": "green",
        "guidance_th": "พักผ่อนให้พอ ดื่มน้ำเพิ่ม กิน paracetamol 500-1000 mg ทุก 6 ชม. ถ้าจำเป็น "
                        "ปรับท่านั่ง ลดเวลาหน้าจอ ถ้าเรื้อรังเกิน 1 สัปดาห์ ปรึกษา GP",
        "guidance_en": "Rest, hydration, paracetamol 500-1000 mg q6h prn. Posture and screen breaks. "
                        "If persists >1 week — telemed GP consult.",
        "specialty_hint": "General Practice",
        "source": "IHS Classification ICHD-3 · Tension-type headache",
    },
    {
        "id": "S037",
        "title": "Common cold / upper respiratory infection",
        "title_th": "เป็นหวัด คัดจมูก น้ำมูกใส ๆ ไอแห้ง ๆ ไข้ต่ำ ๆ 2-3 วัน",
        "severity": "green",
        "guidance_th": "พักผ่อน ดื่มน้ำอุ่น ใช้ paracetamol ลดไข้ ล้างจมูกด้วยน้ำเกลือ "
                        "ส่วนใหญ่หายเองใน 7-10 วัน ไม่ต้องใช้ยาปฏิชีวนะ",
        "guidance_en": "Rest, warm fluids, paracetamol for fever, saline nasal rinse. "
                        "Self-limited 7-10 days. Antibiotics NOT indicated.",
        "specialty_hint": "General Practice",
        "source": "AAFP URI Self-Care Recommendations",
    },
    {
        "id": "S038",
        "title": "Mild non-injury back pain",
        "title_th": "ปวดหลังเล็กน้อย ไม่ปวดร้าวลงขา ขยับได้ปกติ",
        "severity": "green",
        "guidance_th": "ออกกำลังกายเบา ๆ ยืดกล้ามเนื้อหลัง paracetamol หรือ ibuprofen ตามต้องการ "
                        "หลีกเลี่ยงนอนนิ่ง — เคลื่อนไหวเร็วช่วยให้หาย",
        "guidance_en": "Light exercise + back stretches. Paracetamol/ibuprofen prn. "
                        "Avoid bedrest — early mobilization improves outcomes.",
        "specialty_hint": "General Practice",
        "source": "NICE NG59 Low Back Pain · Self-care",
    },
    {
        "id": "S039",
        "title": "Acne — comedonal/inflammatory, no scarring",
        "title_th": "สิวอุดตันและสิวอักเสบ ไม่ทิ้งรอยใหญ่",
        "severity": "green",
        "guidance_th": "ปรึกษาแพทย์ผิวหนัง telemed เพื่อขอ topical retinoid/benzoyl peroxide "
                        "ล้างหน้าด้วยน้ำอุ่น เลี่ยงบีบสิว นัด follow-up 8-12 สัปดาห์",
        "guidance_en": "Telemed Derm for topical retinoid/BPO. Gentle cleansing, avoid picking. "
                        "Re-evaluate at 8-12 weeks.",
        "specialty_hint": "Dermatology",
        "source": "AAD Acne Guidelines 2024",
    },
    {
        "id": "S040",
        "title": "Mild eczema flare",
        "title_th": "ผิวแห้งคันเล็กน้อย เป็น ๆ หาย ๆ ที่ข้อพับ",
        "severity": "green",
        "guidance_th": "ทามอยส์เจอไรเซอร์วันละ 2-3 ครั้ง ใช้ steroid cream อ่อน (1% hydrocortisone) "
                        "เลี่ยงสบู่แรง ปรึกษาแพทย์ผิวหนังหากไม่ดีขึ้นใน 2 สัปดาห์",
        "guidance_en": "Moisturize 2-3x daily. Low-potency steroid (1% hydrocortisone). "
                        "Avoid harsh soap. If no improvement in 2 weeks — Derm consult.",
        "specialty_hint": "Dermatology",
        "source": "AAD Atopic Dermatitis Guideline 2023",
    },
    {
        "id": "S041",
        "title": "Mild GERD / heartburn",
        "title_th": "แสบร้อนกลางอกหลังอาหาร เรอเปรี้ยว ไม่บ่อย",
        "severity": "green",
        "guidance_th": "ลดอาหารมัน เผ็ด หลีกเลี่ยงนอนหลังอาหารทันที ยกหัวเตียงสูง "
                        "ใช้ antacid หรือ omeprazole 20 mg ก่อนอาหารเช้า x 2-4 สัปดาห์",
        "guidance_en": "Reduce spicy/fatty foods. Avoid lying down after eating. Head-of-bed elevation. "
                        "Antacid or omeprazole 20 mg pre-breakfast for 2-4 weeks.",
        "specialty_hint": "Gastroenterology",
        "source": "ACG GERD Guideline 2022",
    },
    {
        "id": "S042",
        "title": "Routine chronic disease med refill (HT/DM stable)",
        "title_th": "ขอต่อยาความดัน/เบาหวานเดิม ไม่มีอาการใหม่ ค่าตรวจปกติ",
        "severity": "green",
        "guidance_th": "telemed กับแพทย์ประจำ ส่งค่า home BP / FBS ล่าสุด ขอใบสั่งยา e-RX "
                        "จัดส่งยาที่บ้าน ติดตามใหม่ 3 เดือน",
        "guidance_en": "Telemed with PCP. Share recent home BP/FBS readings. Get e-prescription "
                        "with home delivery. Follow up in 3 months.",
        "specialty_hint": "Internal Medicine",
        "source": "RCPT · HT / DM stable management",
    },
    {
        "id": "S043",
        "title": "Mild insomnia / sleep hygiene consult",
        "title_th": "นอนหลับยากเป็นบางคืน เครียดงาน ตื่นกลางดึก 1-2 ครั้ง",
        "severity": "green",
        "guidance_th": "ปรับ sleep hygiene — ตื่น/นอนเวลาเดียวกัน ไม่มีหน้าจอ 1 ชม. ก่อนนอน "
                        "ไม่ใช้ caffeine หลัง 14:00 หากไม่ดีขึ้น 2 สัปดาห์ — ปรึกษาจิตแพทย์",
        "guidance_en": "Sleep hygiene fixes. Consistent schedule, no screens 1h before bed, "
                        "no caffeine after 2 PM. If no improvement in 2 weeks — Psychiatry.",
        "specialty_hint": "Psychiatry",
        "source": "AASM Clinical Practice Guideline · Chronic Insomnia",
    },
    {
        "id": "S044",
        "title": "Mild anxiety / work stress consult",
        "title_th": "ความเครียดจากงาน วิตกกังวลเล็กน้อย ยังทำงานได้ปกติ",
        "severity": "green",
        "guidance_th": "ออกกำลังกาย 30 นาที 3-5 วัน/สัปดาห์ ฝึกหายใจ mindfulness "
                        "ปรึกษาจิตแพทย์ telemed หากกระทบงาน/ความสัมพันธ์",
        "guidance_en": "Exercise 30 min 3-5×/week. Mindfulness breathing. Telemed Psychiatry if "
                        "it starts affecting work or relationships.",
        "specialty_hint": "Psychiatry",
        "source": "NICE GAD Guideline CG113",
    },
    {
        "id": "S045",
        "title": "Chronic constipation",
        "title_th": "ถ่ายอุจจาระน้อยกว่า 3 ครั้ง/สัปดาห์ อุจจาระแข็ง อืดท้องเรื้อรัง",
        "severity": "green",
        "guidance_th": "เพิ่มไฟเบอร์ 25-30 g/วัน ดื่มน้ำ 8 แก้ว ออกกำลังกาย "
                        "ใช้ psyllium / polyethylene glycol หากจำเป็น — ถ้ามีเลือดในอุจจาระ พบ GI",
        "guidance_en": "Increase fiber to 25-30 g/d, hydration, exercise. Use psyllium or PEG prn. "
                        "Blood in stool → GI consult.",
        "specialty_hint": "Gastroenterology",
        "source": "ACG Chronic Constipation Guidelines 2021",
    },
    {
        "id": "S046",
        "title": "Hair loss consultation (early thinning)",
        "title_th": "ผมร่วงมากกว่าปกติ มีหนังศีรษะลีบ ทอด ๆ",
        "severity": "green",
        "guidance_th": "ปรึกษาแพทย์ผิวหนังเพื่อแยกประเภท (telogen effluvium vs androgenetic) "
                        "ตรวจระดับเหล็ก B12 ไทรอยด์ ใช้ minoxidil 5% ตามแพทย์สั่ง",
        "guidance_en": "Derm consult to differentiate (telogen effluvium vs androgenetic). "
                        "Check iron, B12, thyroid. Minoxidil 5% as prescribed.",
        "specialty_hint": "Dermatology",
        "source": "AAD Hair Loss Guidelines",
    },
    {
        "id": "S047",
        "title": "Mild menstrual irregularity",
        "title_th": "ประจำเดือนมาไม่ตรงเวลา 1-2 รอบ ปกติเป็นประจำ ไม่มีปวดรุนแรง",
        "severity": "green",
        "guidance_th": "บันทึก cycle ใช้ app ติดตาม 3 เดือน ปรับความเครียด/น้ำหนัก "
                        "ปรึกษาสูตินรีเวช telemed ถ้าผิดปกติเกิน 3 รอบ หรือมีอาการอื่น",
        "guidance_en": "Track cycles via app for 3 months. Manage stress/weight. "
                        "Telemed OB-GYN if >3 abnormal cycles or new symptoms.",
        "specialty_hint": "OB-GYN",
        "source": "ACOG Menstrual Cycle Guidance",
    },
    {
        "id": "S048",
        "title": "Mild allergic rhinitis (seasonal)",
        "title_th": "คัดจมูก จาม น้ำมูกใส คันตา เป็นตามฤดูกาล",
        "severity": "green",
        "guidance_th": "หลีกเลี่ยง allergen ใช้ antihistamine (loratadine 10 mg/d) "
                        "หรือ intranasal steroid (fluticasone) ปรึกษาแพทย์ภูมิแพ้ telemed สำหรับวินิจฉัย",
        "guidance_en": "Avoid allergens. Antihistamine (loratadine 10 mg/d) or intranasal "
                        "fluticasone. Telemed Allergy consult for formal diagnosis.",
        "specialty_hint": "Allergy & Immunology",
        "source": "ARIA Allergic Rhinitis Guidelines 2020",
    },
    {
        "id": "S049",
        "title": "Chronic sinusitis (mild, recurrent)",
        "title_th": "คัดจมูกเรื้อรัง น้ำมูกเหนียวหลังจมูก ปวดโพรงจมูก เป็นเรื้อรังเกิน 12 สัปดาห์",
        "severity": "green",
        "guidance_th": "ล้างจมูกด้วยน้ำเกลือวันละ 2 ครั้ง ใช้ intranasal steroid ปรึกษา ENT telemed "
                        "ถ้าไม่ดีขึ้นใน 4 สัปดาห์ อาจต้องพิจารณา CT sinus",
        "guidance_en": "Saline nasal rinse 2x daily + intranasal steroid. Telemed ENT consult. "
                        "If no improvement at 4 weeks → consider CT sinus.",
        "specialty_hint": "ENT",
        "source": "AAO-HNS Adult Sinusitis Guideline 2024",
    },
    {
        "id": "S050",
        "title": "Diet / weight management consultation",
        "title_th": "ต้องการลดน้ำหนัก ปรึกษาเรื่องอาหารและการออกกำลังกาย",
        "severity": "green",
        "guidance_th": "ปรึกษาแพทย์ telemed (endocrine หรือ GP) ประเมิน BMI, lipid, FBS, HbA1c "
                        "ตั้งเป้าลด 5-10% ใน 6 เดือน ออกกำลังกาย 150 นาที/สัปดาห์",
        "guidance_en": "Telemed Endocrine/GP. Assess BMI, lipids, FBS, HbA1c. Target 5-10% weight "
                        "loss over 6 months. 150 min/week moderate exercise.",
        "specialty_hint": "Endocrinology",
        "source": "RCPT Obesity Management 2024",
    },
]


def severity_counts() -> dict[str, int]:
    counts = {"red": 0, "yellow": 0, "green": 0}
    for e in KB_ENTRIES:
        counts[e["severity"]] += 1
    return counts


def text_for_embedding(entry: dict) -> str:
    """Combine title + guidance for the embedding so RAG retrieval works on
    both English and Thai queries."""
    return (
        f"{entry['title']} | {entry['title_th']} | "
        f"severity={entry['severity']} | specialty={entry['specialty_hint']} | "
        f"{entry['guidance_en']} | {entry['guidance_th']}"
    )

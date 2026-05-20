import { GlassCard } from "@/components/shared/GlassCard";
import { RoleHeader } from "@/components/shared/RoleHeader";
import { EmptyState } from "@/components/shared/EmptyState";

const SECTIONS = [
  { title: "Symptom Chat", titleEn: "แชทอาการ", phase: "Phase 5" },
  { title: "Triage Result 🟢🟡🔴", titleEn: "ผลการประเมิน", phase: "Phase 5" },
  { title: "Doctor List", titleEn: "รายชื่อแพทย์", phase: "Phase 5" },
  { title: "Booking", titleEn: "จองคิว", phase: "Phase 5" },
  { title: "Mock Payment", titleEn: "ชำระเงิน", phase: "Phase 5" },
  { title: "Consult Chat", titleEn: "ห้องปรึกษา", phase: "Phase 5" },
  {
    title: "Consult Summary",
    titleEn: "ใบรับรองแพทย์ + แผนดูแลตัวเอง",
    phase: "Phase 5",
  },
];

export default function PatientPage() {
  return (
    <>
      <RoleHeader title="ผู้ป่วย · Patient" subtitle="คุณ Pol" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6 md:px-12 md:py-8">
        <div className="flex flex-col gap-5">
          {SECTIONS.map((section) => (
            <GlassCard key={section.title}>
              <EmptyState
                title={section.title}
                titleEn={section.titleEn}
                phase={section.phase}
              />
            </GlassCard>
          ))}
        </div>
      </main>
    </>
  );
}

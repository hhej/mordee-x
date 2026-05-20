import { GlassCard } from "@/components/shared/GlassCard";
import { RoleHeader } from "@/components/shared/RoleHeader";
import { EmptyState } from "@/components/shared/EmptyState";

const SECTIONS = [
  {
    title: "Demand Forecast",
    titleEn: "พยากรณ์ความต้องการ",
    phase: "Phase 4",
  },
  {
    title: "Today's Appointments",
    titleEn: "นัดหมายวันนี้",
    phase: "Phase 4",
  },
  { title: "Consult Panel", titleEn: "ห้องปรึกษา", phase: "Phase 4" },
  {
    title: "Consult Summary",
    titleEn: "ใบรับรองแพทย์ + แผนดูแลตัวเอง",
    phase: "Phase 4",
  },
];

export default function DoctorPage() {
  return (
    <>
      <RoleHeader title="แพทย์ · Doctor" subtitle="นพ. ธนพล ใจกล้า" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-6 md:px-12 md:py-8">
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

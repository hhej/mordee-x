import Link from "next/link";
import { ArrowRight, Stethoscope, UserRound, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-12 md:px-12 md:py-20">
      <div className="mb-10 md:mb-14">
        <div className="mb-3 text-3xl font-bold tracking-tight text-mint-700 md:text-4xl">
          MorDee+ 🌿
        </div>
        <p className="max-w-xl text-base text-muted-foreground md:text-lg">
          AI telemedicine · ดูแลสุขภาพ ใกล้แค่ปลายนิ้ว
        </p>
      </div>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {/* Patient (hero) — col-span-2 */}
        <Link
          href="/patient"
          className="group md:col-span-2"
          aria-label="เข้าใช้งานในฐานะผู้ป่วย"
        >
          <GlassCard className="flex h-full min-h-[280px] flex-col justify-between p-8 group-hover:-translate-y-1 group-hover:shadow-xl md:min-h-[340px] md:p-10">
            <div>
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-100 text-mint-700 md:h-16 md:w-16">
                <UserRound className="h-7 w-7 md:h-8 md:w-8" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-ink md:text-3xl">
                ฉันเป็นผู้ป่วย
              </h2>
              <p className="text-base text-muted-foreground md:text-lg">
                Talk to a doctor in 60 seconds
              </p>
            </div>

            <ul className="mt-8 grid grid-cols-1 gap-2 text-sm text-ink md:grid-cols-3 md:text-base">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
                <span>ประเมินอาการเบื้องต้น · AI triage</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
                <span>จองแพทย์ใน 1 นาที</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
                <span>ใบรับรองแพทย์ + แผนดูแลตัวเอง</span>
              </li>
            </ul>

            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-mint-700 transition-transform group-hover:translate-x-1 md:text-base">
              เริ่มเลย · Get started
              <ArrowRight className="h-4 w-4" />
            </div>
          </GlassCard>
        </Link>

        {/* Doctor — col-span-1 */}
        <Link
          href="/doctor"
          className="group"
          aria-label="เข้าใช้งานในฐานะแพทย์"
        >
          <GlassCard className="flex h-full min-h-[280px] flex-col justify-between p-8 group-hover:-translate-y-1 group-hover:shadow-xl md:min-h-[340px]">
            <div>
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-100 text-mint-700">
                <Stethoscope className="h-7 w-7" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-ink md:text-2xl">
                สำหรับแพทย์
              </h2>
              <p className="text-sm text-muted-foreground md:text-base">
                Doctor dashboard
              </p>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-mint-700 transition-transform group-hover:translate-x-1">
              เข้าสู่ระบบ · Enter
              <ArrowRight className="h-4 w-4" />
            </div>
          </GlassCard>
        </Link>
      </section>

      <p className="mt-10 max-w-2xl text-xs leading-relaxed text-muted-foreground md:text-sm">
        ⚠️ MorDee+ ให้คำแนะนำเบื้องต้นเท่านั้น ไม่ใช่การวินิจฉัยทางการแพทย์
        กรุณาปรึกษาแพทย์ที่ได้รับใบอนุญาตสำหรับการตัดสินใจสำคัญ ·{" "}
        <span className="opacity-70">
          MorDee+ provides preliminary guidance only. Not a medical diagnosis.
        </span>
      </p>
    </main>
  );
}

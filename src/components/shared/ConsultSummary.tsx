'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, FileCheck2, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/shared/GlassCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SummaryResult } from '@/lib/llm/schemas';
import { MedicalCertificate } from './MedicalCertificate';
import { SelfCarePlan } from './SelfCarePlan';

export interface ConsultSummaryProps {
  /** Hide the entire card when false. */
  visible: boolean;
  isSummarizing: boolean;
  summary: SummaryResult | null;
  summaryError: string | null;

  patientName: string;
  patientAge?: number;
  doctorName: string;
  doctorSpecialty: string;

  /** Which tab is shown first. Doctor side defaults to 'cert', patient side to 'care'. */
  defaultTab?: 'cert' | 'care';

  /**
   * Render the follow-up row when summary.needs_followup is true.
   * If omitted, a minimal "ไม่ได้กำหนดการติดตาม" placeholder is rendered instead.
   */
  renderFollowup?: (args: { daysFromNow: number; reason: string | null }) => ReactNode;

  /**
   * Optional post-summary upsell rendered at the bottom of the self-care tab.
   * Patient side passes the health-checkup advisor; doctor side omits it.
   */
  renderCheckupUpsell?: () => ReactNode;

  /**
   * Optional retry handler. When the summary fails and no `summary` is set
   * (pure-error state), the error block renders a "ลองอีกครั้ง" button that
   * invokes this callback. Doctor side omits it since it falls back to the
   * cached summary; patient side passes endConsult.
   */
  onRetry?: () => void;
}

export function ConsultSummary({
  visible,
  isSummarizing,
  summary,
  summaryError,
  patientName,
  patientAge,
  doctorName,
  doctorSpecialty,
  defaultTab = 'cert',
  renderFollowup,
  renderCheckupUpsell,
  onRetry,
}: ConsultSummaryProps) {
  if (!visible) return null;

  const pureError = !isSummarizing && !summary && summaryError !== null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-4 text-mint-700" />
              <h2 className="text-base font-semibold text-ink md:text-lg">สรุปการปรึกษา</h2>
              <span className="text-xs text-muted-foreground">Consult summary</span>
            </div>
            {isSummarizing ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-mint-50 px-2.5 py-1 text-[11px] text-mint-800">
                <Loader2 className="size-3 animate-spin" />
                AI กำลังสรุปจากบทสนทนา…
              </div>
            ) : summary && !summaryError ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-2.5 py-1 text-[11px] text-mint-800">
                <Sparkles className="size-3" />
                สรุปจากบทสนทนาจริง
              </div>
            ) : null}
          </div>

          {summary && summaryError ? (
            <div className="mb-3 rounded-md bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800 ring-1 ring-amber-200">
              ⚠ {summaryError}
            </div>
          ) : null}

          {isSummarizing && !summary ? (
            <div className="grid place-items-center py-16">
              <Loader2 className="size-6 animate-spin text-mint-600" />
              <div className="mt-2 text-sm text-muted-foreground">
                กำลังสรุปการสนทนา · ระบบจะดึงยา การวินิจฉัย และคำแนะนำจากที่คุยกัน
              </div>
            </div>
          ) : pureError ? (
            <div className="grid place-items-center gap-3 py-12">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <AlertTriangle className="size-6" />
              </div>
              <div className="max-w-md text-center text-sm text-ink">
                <div className="font-medium">สรุปการสนทนาล้มเหลว</div>
                <div className="mt-1 text-xs text-muted-foreground">{summaryError}</div>
              </div>
              {onRetry ? (
                <Button size="sm" variant="default" onClick={onRetry}>
                  <RotateCcw className="size-3.5" />
                  ลองอีกครั้ง · Retry
                </Button>
              ) : null}
            </div>
          ) : summary ? (
            <>
              <Tabs defaultValue={defaultTab}>
                <TabsList>
                  <TabsTrigger value="cert">ใบรับรองแพทย์ · Certificate</TabsTrigger>
                  <TabsTrigger value="care">แผนดูแลตัวเอง · Self-care</TabsTrigger>
                </TabsList>
                <TabsContent value="cert" className="pt-4">
                  <MedicalCertificate
                    summary={summary}
                    patientName={patientName}
                    patientAge={patientAge}
                    doctorName={doctorName}
                    doctorSpecialty={doctorSpecialty}
                  />
                </TabsContent>
                <TabsContent value="care" className="pt-4">
                  <SelfCarePlan plan={summary.self_care_plan} />
                  {renderCheckupUpsell ? renderCheckupUpsell() : null}
                </TabsContent>
              </Tabs>

              {summary.needs_followup ? (
                renderFollowup ? (
                  <div className="mt-5">
                    {renderFollowup({
                      daysFromNow: summary.followup_in_days ?? 7,
                      reason: summary.followup_reason_th,
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                    แนะนำให้นัดติดตามใน {summary.followup_in_days ?? 7} วัน
                    <span className="ml-1 opacity-70">· Follow-up in {summary.followup_in_days ?? 7} days</span>
                  </div>
                )
              ) : (
                <div className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                  ไม่จำเป็นต้องนัดติดตาม
                  <span className="ml-1 opacity-70">· No follow-up needed</span>
                </div>
              )}
            </>
          ) : null}
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
}

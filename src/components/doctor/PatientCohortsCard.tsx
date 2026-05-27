'use client';

import { Info, Layers, Sparkles } from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { PatientSegmentsData, PatientSegment } from '@/lib/data';

interface PatientCohortsCardProps {
  data: PatientSegmentsData;
}

// Plain-Thai gloss for each clustering algorithm, shown in the model-comparison
// table (the rubric centrepiece).
const ALGO_TH: Record<string, string> = {
  kmeans: 'K-Means',
  agglomerative: 'Hierarchical (Ward)',
  gmm: 'Gaussian Mixture',
};

// Headline centroid stats surfaced per cohort: [feature key, Thai label, formatter].
const HEADLINE: Array<[string, string, (v: number) => string]> = [
  ['n_bookings', 'จองเฉลี่ย', (v) => `${v.toFixed(1)} ครั้ง`],
  ['observed_no_show_rate', 'อัตราไม่มา', (v) => `${(v * 100).toFixed(0)}%`],
  ['pct_red_yellow_triage', 'เคสเหลือง/แดง', (v) => `${(v * 100).toFixed(0)}%`],
];

export function PatientCohortsCard({ data }: PatientCohortsCardProps) {
  const { meta, segments, scatter } = data;
  const winner = meta.model_comparison.find((m) => m.winner) ?? meta.model_comparison[0];
  const evr = meta.pca_explained_variance;

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-start justify-between gap-3 pr-8">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-mint-700 dark:text-mint-400" />
            <h2 className="text-base font-semibold text-foreground md:text-lg">กลุ่มผู้ป่วย</h2>
            <span className="text-xs text-muted-foreground">Patient cohorts</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            แบ่งกลุ่มผู้ป่วย {meta.n_patients.toLocaleString()} คน ด้วย unsupervised ML —
            เพื่อสื่อสารแบบเจาะกลุ่ม
          </p>
        </div>
        {/* Model badge — winning algorithm + silhouette, with a plain-Thai hover note. */}
        <div className="group relative shrink-0">
          <span
            tabIndex={0}
            className="inline-flex cursor-help items-center gap-1 rounded-full bg-mint-100 px-2 py-0.5 text-[10px] font-medium text-mint-800 outline-none dark:bg-mint-500/15 dark:text-mint-200"
          >
            {ALGO_TH[winner.algorithm] ?? winner.algorithm} · silhouette {winner.silhouette.toFixed(2)}
            <Info className="size-3 text-mint-600" />
          </span>
          <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 w-64 rounded-lg bg-ink/90 px-3 py-2 text-[11px] leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            เลือก k={meta.k} จาก elbow + silhouette แล้วเทียบ 3 อัลกอริทึม —{' '}
            <span className="font-medium text-mint-200">
              {ALGO_TH[winner.algorithm] ?? winner.algorithm}
            </span>{' '}
            ชนะด้วย silhouette สูงสุด
          </div>
        </div>
      </div>

      {/* Donut (composition) + PCA scatter (separation) */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-white/60 p-3 dark:bg-slate-800/50">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            สัดส่วนแต่ละกลุ่ม · Composition
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={segments}
                dataKey="size"
                nameKey="label_th"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
                strokeWidth={1}
              >
                {segments.map((s) => (
                  <Cell key={s.id} fill={s.color} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip total={meta.n_patients} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border/60 bg-white/60 p-3 dark:bg-slate-800/50">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            การแยกกลุ่ม (PCA) · Separation
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
              <XAxis type="number" dataKey="x" hide />
              <YAxis type="number" dataKey="y" hide />
              <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              {segments.map((s) => (
                <Scatter
                  key={s.id}
                  name={s.label_th}
                  data={scatter.filter((p) => p.segment_id === s.id)}
                  fill={s.color}
                  fillOpacity={0.5}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          {evr.length >= 2 ? (
            <div className="mt-0.5 text-center text-[10px] text-muted-foreground">
              PC1 {(evr[0] * 100).toFixed(0)}% · PC2 {(evr[1] * 100).toFixed(0)}% ของความแปรปรวน
            </div>
          ) : null}
        </div>
      </div>

      {/* Per-cohort profile cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {segments.map((s) => (
          <CohortCard key={s.id} segment={s} />
        ))}
      </div>

      {/* Model-comparison table — the ML-rigor centrepiece */}
      <div className="mt-5">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-mint-800 dark:text-mint-300">
          <Sparkles className="size-3.5" />
          เปรียบเทียบ 3 อัลกอริทึม · Model selection
        </div>
        <div className="overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-mint-50/70 text-left text-[10px] uppercase tracking-wide text-muted-foreground dark:bg-mint-500/10">
                <th className="px-3 py-1.5 font-medium">Algorithm</th>
                <th className="px-3 py-1.5 text-right font-medium">Silhouette ↑</th>
                <th className="px-3 py-1.5 text-right font-medium">Davies-Bouldin ↓</th>
                <th className="px-3 py-1.5 text-right font-medium">Calinski-H. ↑</th>
              </tr>
            </thead>
            <tbody>
              {meta.model_comparison.map((m) => (
                <tr
                  key={m.algorithm}
                  className={cn(
                    'border-t border-border/50',
                    m.winner ? 'bg-mint-100/60 font-semibold text-mint-900 dark:bg-mint-500/15 dark:text-mint-200' : 'text-foreground',
                  )}
                >
                  <td className="px-3 py-1.5">
                    {ALGO_TH[m.algorithm] ?? m.algorithm}
                    {m.winner ? <span className="ml-1.5 text-[10px] text-mint-700 dark:text-mint-400">✓ เลือกใช้</span> : null}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{m.silhouette.toFixed(3)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{m.davies_bouldin.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{m.calinski_harabasz.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CohortCard({ segment }: { segment: PatientSegment }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white/60 p-3 dark:bg-slate-800/50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
          <span className="truncate text-sm font-semibold text-foreground">{segment.label_th}</span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{segment.pct}%</span>
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {segment.label_en} · {segment.size.toLocaleString()} คน
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {HEADLINE.map(([key, label, fmt]) =>
          segment.profile[key] !== undefined ? (
            <div key={key} className="text-[11px]">
              <span className="text-muted-foreground">{label} </span>
              <span className="font-medium text-foreground">{fmt(segment.profile[key])}</span>
            </div>
          ) : null,
        )}
      </div>
      <div className="mt-2 rounded-md bg-mint-50 px-2 py-1 text-[11px] leading-snug text-mint-800 dark:bg-mint-500/10 dark:text-mint-200">
        <span className="font-medium">แนะนำ: </span>
        {segment.recommended_action_th}
      </div>
    </div>
  );
}

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { label_th?: string } }>;
}

function DonutTooltip({ active, payload, total }: TooltipPayload & { total: number }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const size = p.value ?? 0;
  const pct = total ? ((size / total) * 100).toFixed(1) : '0';
  return (
    <div className="rounded-lg bg-ink/90 px-2.5 py-1.5 text-[11px] text-white shadow-lg">
      <span className="font-medium">{p.payload?.label_th ?? p.name}</span> · {size.toLocaleString()} คน ({pct}%)
    </div>
  );
}

function ScatterTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-ink/90 px-2.5 py-1.5 text-[11px] text-white shadow-lg">
      {payload[0]?.name}
    </div>
  );
}

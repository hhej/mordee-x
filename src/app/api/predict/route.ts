import { NextRequest, NextResponse } from 'next/server';
import { PredictQuerySchema } from '@/lib/llm/schemas';
import { getNoShow, getDemand, getPatientSegment, getSegments } from '@/lib/data';
import { dbGetMlArtifact, dbGetPatientSegment, dbGetSegments } from '@/lib/db';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = PredictQuerySchema.safeParse({
    type: url.searchParams.get('type'),
    id: url.searchParams.get('id') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { type, id } = parsed.data;

  // Whole patient-segmentation payload (doctor dashboard cohorts card).
  if (type === 'segments') {
    const data = (await dbGetSegments()) ?? getSegments();
    return NextResponse.json(data);
  }

  if (!id) {
    return NextResponse.json({ error: `id is required for type=${type}` }, { status: 400 });
  }

  // DB-first with JSON fallback on every branch (DB row || bundled JSON getter).
  if (type === 'no_show') {
    const data = (await dbGetMlArtifact('no_show', id)) ?? getNoShow(id);
    if (!data) return NextResponse.json({ error: `No prediction for ${id}` }, { status: 404 });
    return NextResponse.json(data);
  }

  if (type === 'segment') {
    const seg = (await dbGetPatientSegment(id)) ?? getPatientSegment(id);
    if (!seg) return NextResponse.json({ error: `No segment for ${id}` }, { status: 404 });
    return NextResponse.json(seg);
  }

  const data = (await dbGetMlArtifact('demand', id)) ?? getDemand(id);
  if (!data) return NextResponse.json({ error: `No forecast for ${id}` }, { status: 404 });
  return NextResponse.json(data);
}

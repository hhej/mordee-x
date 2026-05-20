import { NextRequest, NextResponse } from 'next/server';
import { PredictQuerySchema } from '@/lib/llm/schemas';
import { getNoShow, getDemand } from '@/lib/data';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = PredictQuerySchema.safeParse({
    type: url.searchParams.get('type'),
    id: url.searchParams.get('id'),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { type, id } = parsed.data;

  if (type === 'no_show') {
    const data = getNoShow(id);
    if (!data) return NextResponse.json({ error: `No prediction for ${id}` }, { status: 404 });
    return NextResponse.json(data);
  }

  const data = getDemand(id);
  if (!data) return NextResponse.json({ error: `No forecast for ${id}` }, { status: 404 });
  return NextResponse.json(data);
}

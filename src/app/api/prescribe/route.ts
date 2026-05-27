import { NextRequest, NextResponse } from 'next/server';
import { PrescribeRequestSchema } from '@/lib/llm/schemas';
import { runPrescribe } from '@/lib/llm/graphs/prescribe';
import { mockPrescribe } from '@/lib/mocks';

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = PrescribeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  if (req.nextUrl.searchParams.get('mock') === '1') {
    return NextResponse.json(mockPrescribe(parsed.data));
  }
  try {
    const result = await runPrescribe(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

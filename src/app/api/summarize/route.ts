import { NextRequest, NextResponse } from 'next/server';
import { SummarizeRequestSchema } from '@/lib/llm/schemas';
import { runSummarize } from '@/lib/llm/graphs/summarize';
import { mockSummarize } from '@/lib/mocks';

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SummarizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  if (req.nextUrl.searchParams.get('mock') === '1') {
    return NextResponse.json(mockSummarize());
  }
  try {
    const result = await runSummarize(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

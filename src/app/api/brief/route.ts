import { NextRequest, NextResponse } from 'next/server';
import { BriefRequestSchema } from '@/lib/llm/schemas';
import { runBrief } from '@/lib/llm/graphs/brief';
import { mockBrief } from '@/lib/mocks';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BriefRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  if (req.nextUrl.searchParams.get('mock') === '1') {
    return NextResponse.json(mockBrief());
  }
  try {
    const result = await runBrief(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

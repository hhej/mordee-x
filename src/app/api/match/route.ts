import { NextRequest, NextResponse } from 'next/server';
import { MatchRequestSchema } from '@/lib/llm/schemas';
import { runMatch } from '@/lib/llm/graphs/match';
import { mockMatch } from '@/lib/mocks';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = MatchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  if (req.nextUrl.searchParams.get('mock') === '1') {
    return NextResponse.json({ ranked: mockMatch(parsed.data.specialty_hint) });
  }
  try {
    const ranked = await runMatch(parsed.data);
    return NextResponse.json({ ranked });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

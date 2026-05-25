import { NextRequest, NextResponse } from 'next/server';
import { CheckupRequestSchema } from '@/lib/llm/schemas';
import { runCheckup } from '@/lib/llm/graphs/checkup';
import { mockCheckup } from '@/lib/mocks';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CheckupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  if (req.nextUrl.searchParams.get('mock') === '1') {
    return NextResponse.json(mockCheckup());
  }
  try {
    const result = await runCheckup(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

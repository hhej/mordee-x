import { NextRequest, NextResponse } from 'next/server';
import { TriageRequestSchema } from '@/lib/llm/schemas';
import { runTriage } from '@/lib/llm/graphs/triage';
import { mockTriage } from '@/lib/mocks';

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = TriageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  if (req.nextUrl.searchParams.get('mock') === '1') {
    return NextResponse.json(mockTriage(parsed.data.symptom_text));
  }
  try {
    const result = await runTriage(parsed.data.symptom_text);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

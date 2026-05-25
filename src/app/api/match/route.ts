import { NextRequest } from 'next/server';
import { MatchRequestSchema } from '@/lib/llm/schemas';
import { streamMatch } from '@/lib/llm/graphs/match';
import { mockMatch } from '@/lib/mocks';

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = MatchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isMock = req.nextUrl.searchParams.get('mock') === '1';
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        if (isMock) {
          const ranked = mockMatch(parsed.data.specialty_hint);
          for (const r of ranked) send({ type: 'doctor', data: r });
          send({ type: 'done', data: { total: ranked.length } });
          controller.close();
          return;
        }
        for await (const event of streamMatch(parsed.data)) {
          send(event);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: 'error', data: { message } });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

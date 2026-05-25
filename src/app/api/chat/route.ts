import { NextRequest } from 'next/server';
import { ChatRequestSchema } from '@/lib/llm/schemas';
import { streamChat } from '@/lib/llm/graphs/chat';
import { mockChat } from '@/lib/mocks';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isMock = req.nextUrl.searchParams.get('mock') === '1';
  const source = isMock ? mockChat() : streamChat(parsed.data);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of source) {
          const frame = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(frame));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const frame = `data: ${JSON.stringify({ type: 'error', data: { message } })}\n\n`;
        controller.enqueue(encoder.encode(frame));
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

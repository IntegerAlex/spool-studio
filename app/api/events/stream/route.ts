import { subscribe } from '@/lib/event-bus';

export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function sendEvent(e: { type: string; payload?: unknown }) {
        try {
          const data = `event: ${e.type}\ndata: ${JSON.stringify(e.payload ?? {})}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (_err) {
          // ignore
        }
      }

      const unsubscribe = subscribe(sendEvent);

      if (request.signal) {
        request.signal.addEventListener('abort', () => {
          unsubscribe();
          try {
            controller.close();
          } catch (_e) {}
        });
      }
    },
    cancel() {
      // handled by abort listener
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

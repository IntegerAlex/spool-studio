import { subscribe } from "@/lib/event-bus"
import { requireUser } from "@/lib/auth"

export async function GET(request: Request) {
  let currentUser
  try {
    currentUser = await requireUser()
  } catch {
    return new Response("Unauthorized", { status: 401 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      function sendEvent(e: { type: string; payload?: unknown }) {
        try {
          const data = `event: ${e.type}\ndata: ${JSON.stringify(e.payload ?? {})}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch {
          // ignore
        }
      }

      const unsubscribe = subscribe((event) => {
        // SAFETY: payload shapes vary per event type; we only read the optional userId.
        const payloadUserId = (event.payload as { userId?: string } | null)
          ?.userId
        const eventUserId = event.userId ?? payloadUserId
        if (eventUserId && eventUserId !== currentUser.id) {
          return
        }
        sendEvent(event)
      })

      if (request.signal) {
        request.signal.addEventListener("abort", () => {
          unsubscribe()
          try {
            controller.close()
          } catch {}
        })
      }
    },
    cancel() {
      // handled by abort listener
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}

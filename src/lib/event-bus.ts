export type EventPayload = {
  type: string
  payload?: unknown
  timestamp?: string
  userId?: string
}

const listeners = new Set<(e: EventPayload) => void>()

export function emitEvent(event: EventPayload) {
  for (const listener of Array.from(listeners)) {
    try {
      listener(event)
    } catch {
      // swallow listener errors
    }
  }
}

export function subscribe(listener: (e: EventPayload) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function clearAllListeners() {
  listeners.clear()
}

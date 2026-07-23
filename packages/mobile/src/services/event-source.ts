import { getClient } from "./api"
import type { V2Event } from "@opencode-ai/client/promise"

export function subscribeSession(
  sessionID: string,
  onEvent: (event: V2Event & { data: { sessionID: string } }) => void,
  signal: AbortSignal,
) {
  const stream = getClient().event.subscribe({ signal })
  ;(async () => {
    try {
      for await (const event of stream) {
        if ("sessionID" in event.data && event.data.sessionID === sessionID) {
          onEvent(event as V2Event & { data: { sessionID: string } })
        }
      }
    } catch (error) {
      if (!signal.aborted) console.warn("Event stream disconnected", error)
    }
  })()
}

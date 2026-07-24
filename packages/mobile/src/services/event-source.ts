import { getClient } from "./api";
import type { V2Event } from "@opencode-ai/client/promise";

const BASE_DELAY = 1_000;
const MAX_DELAY = 30_000;

export function subscribeSession(
  sessionID: string,
  onEvent: (event: V2Event & { data: { sessionID: string } }) => void,
  signal: AbortSignal,
) {
  let errorLogged = false;

  (async () => {
    let delay = BASE_DELAY;
    while (!signal.aborted) {
      const attempt = new AbortController();
      const onAbort = () => attempt.abort();
      signal.addEventListener("abort", onAbort);

      try {
        const stream = getClient().event.subscribe({ signal: attempt.signal });
        delay = BASE_DELAY;
        errorLogged = false;

        for await (const event of stream) {
          if ("sessionID" in event.data && event.data.sessionID === sessionID) {
            onEvent(event as V2Event & { data: { sessionID: string } });
          }
        }
      } catch (error) {
        if (!signal.aborted && !errorLogged) {
          errorLogged = true;
          console.warn("Event stream disconnected, reconnecting...", error);
        }
      } finally {
        signal.removeEventListener("abort", onAbort);
        if (signal.aborted) break;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, MAX_DELAY);
    }
  })();
}

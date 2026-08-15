import type { ConnectionStatusEvent } from "@/services/event-manager";
import type { CueInput } from "@/types/cue";

export const CONNECTION_CUE_KEY = "connection.status";

// Cues exist only after the first successful connection of the current
// server config: before that, the connect screen owns feedback (its spinner
// and inline error), and a raised cue would linger invisibly without a cue
// surface and resurface later in the sheet.
export function connectionCue(
  event: ConnectionStatusEvent,
  wasConnected: boolean,
  actions: { retry: () => void; disconnect: () => void },
): CueInput | undefined {
  if (!wasConnected) return undefined;
  if (event.status === "reconnecting") {
    return {
      key: CONNECTION_CUE_KEY,
      kind: "warning",
      title: "Reconnecting…",
      description: `Attempt ${event.attempt}`,
      sticky: true,
    };
  }
  if (event.status === "disconnected") {
    return {
      key: CONNECTION_CUE_KEY,
      kind: "error",
      title: "Connection lost",
      description: event.error,
      actions: [
        { label: "Retry", onPress: actions.retry },
        { label: "Change server", onPress: actions.disconnect },
      ],
      sticky: true,
    };
  }
  if (event.status === "connected") {
    return {
      key: CONNECTION_CUE_KEY,
      kind: "success",
      title: "Reconnected",
      ttl: 3_000,
    };
  }
  return undefined;
}

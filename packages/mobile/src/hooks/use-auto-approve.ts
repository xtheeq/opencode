import { sweepAutoApproved } from "@/services/blocker-reply";
import { eventStore, setAutoApprove } from "@/stores/store";

export function useAutoApprove(sessionID: string) {
  const enabled = eventStore((s) => s.session.autoApprove[sessionID] ?? false);

  const toggle = () => {
    const next = !enabled;
    eventStore.setState((s) => {
      setAutoApprove(s, sessionID, next);
    });
    // Answer requests that arrived before the toggle was enabled.
    if (next) sweepAutoApproved(sessionID);
  };

  return { enabled, toggle };
}

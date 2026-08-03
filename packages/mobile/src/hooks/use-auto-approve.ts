import { replyPermission } from "@/services/blocker-reply";
import { eventStore, setAutoApprove } from "@/stores/store";

export function useAutoApprove(sessionID: string) {
  const enabled = eventStore((s) => s.session.autoApprove[sessionID] ?? false);

  const toggle = () => {
    eventStore.setState((s) => {
      const next = !s.session.autoApprove[sessionID];
      setAutoApprove(s, sessionID, next);
      if (!next) return;
      // Answer requests that arrived before the toggle was enabled.
      (s.session.blocker[sessionID] ?? [])
        .filter((blocker) => blocker.kind === "permission")
        .forEach((blocker) => {
          void replyPermission({
            sessionID,
            requestID: blocker.request.id,
            reply: "once",
          }).catch(() => undefined);
        });
    });
  };

  return { enabled, toggle };
}

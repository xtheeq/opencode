import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { eventStore, loadMessages } from "@/stores/event-store";
import type {
  SessionInfo,
  SessionMessageInfo,
} from "@opencode-ai/client/promise";

export function useSessions() {
  return eventStore(
    useShallow((s) =>
      Object.values(s.session.info).sort(
        (a, b) => b.time.updated - a.time.updated,
      ),
    ),
  );
}

export function useSessionsLoaded() {
  return eventStore((s) => s._loadedSessions);
}

export function useSessionInfo(sessionID: string) {
  return eventStore((s) => s.session.info[sessionID]);
}

export function useSessionActive(sessionID: string) {
  return eventStore((s) => s.session.active[sessionID] ?? "idle");
}

export function useSessionMessages(sessionID: string) {
  const loaded = eventStore((s) => s._loadedMessages[sessionID]);
  useEffect(() => {
    if (!loaded) loadMessages(sessionID);
  }, [sessionID, loaded]);
  return eventStore((s) => s.session.message[sessionID] ?? []);
}

export type { SessionInfo, SessionMessageInfo };

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { eventStore } from "@/stores/store";
import { loadMessages } from "@/stores/sync";
import type {
  SessionInfo,
  SessionMessageInfo,
} from "@opencode-ai/client/promise";

const EMPTY_MESSAGES: never[] = [];

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
  const state = eventStore(
    useShallow((s) => ({
      loaded: s._loadedMessages[sessionID] ?? false,
      loading: s._loadingMessages[sessionID] ?? false,
      messages: s.session.message[sessionID] ?? EMPTY_MESSAGES,
    })),
  );
  useEffect(() => {
    if (!state.loaded) loadMessages(sessionID);
  }, [sessionID, state.loaded]);
  return state;
}

export type { SessionInfo, SessionMessageInfo };

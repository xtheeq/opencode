import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { eventStore } from "@/stores/store";
import { hydrateSession } from "@/stores/sync";
import type {
  SessionInfo,
  SessionMessageInfo,
} from "@opencode-ai/client/promise";

const EMPTY_MESSAGES: never[] = [];

export function useClient() {
  return eventStore((s) => s._client);
}

export function useConnectionStatus() {
  return eventStore((s) => s.connection);
}

export type ConnectionState =
  | "loading"
  | "idle"
  | "checking"
  | "connected"
  | "error";

export function useConnectionState(): ConnectionState {
  const initialized = eventStore((s) => s._serverConfigLoaded);
  const hasServer = eventStore((s) => s._client !== null);
  const connection = useConnectionStatus();
  if (!initialized) return "loading";
  if (!hasServer) return "idle";
  if (connection.status === "connected") return "connected";
  if (
    connection.status === "connecting" ||
    connection.status === "reconnecting"
  )
    return "checking";
  return "error";
}

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

export function useSessionMessagesRaw(sessionID: string) {
  return eventStore((s) => s.session.message[sessionID]);
}

export function useSessionMessages(sessionID: string) {
  const state = eventStore(
    useShallow((s) => ({
      hydration: s._hydration[sessionID],
      messages: s.session.message[sessionID] ?? EMPTY_MESSAGES,
    })),
  );
  useEffect(() => {
    if (state.hydration !== "loaded") void hydrateSession(sessionID);
  }, [sessionID, state.hydration]);
  return {
    messages: state.messages,
    loaded: state.hydration === "loaded",
    loading: state.hydration === "loading",
  };
}

export type { SessionInfo, SessionMessageInfo };

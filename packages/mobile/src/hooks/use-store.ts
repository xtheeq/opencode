import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { activeAssistant, eventStore } from "@/stores/store";
import { hydrateSession } from "@/stores/sync";
import { sortProjects } from "@/utils/project";
import type { SessionInfo, SessionMessageInfo } from "@opencode/client/promise";
import { connectionPhase } from "@/utils/connection-phase";
import type { ConnectionPhase } from "@/types/connection";

const EMPTY_MESSAGES: never[] = [];

export function useClient() {
  return eventStore((s) => s._client);
}

export function useConnectionStatus() {
  return eventStore((s) => s.connection);
}

export function useConnectionPhase(): ConnectionPhase {
  return eventStore((s) =>
    connectionPhase({
      configLoaded: s._serverConfigLoaded,
      configured: s._client !== null,
      status: s.connection.status,
      everConnected: s.connection.everConnected,
    }),
  );
}

export function useServerUrl(): string | null {
  return eventStore((s) => s._serverUrl);
}

export function useSessions() {
  const sessions = eventStore(useShallow((s) => Object.values(s.session.info)));
  return [...sessions].sort((a, b) => b.time.updated - a.time.updated);
}

export function useSessionsLoaded() {
  return eventStore((s) => s._loadedSessions);
}

export function useProjects() {
  const projects = eventStore(useShallow((s) => Object.values(s.project.info)));
  return sortProjects(projects);
}

export function useProjectsLoaded() {
  return eventStore((s) => s._loadedProjects);
}

export function useActiveLocation() {
  return eventStore((s) => s._defaultLocation);
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

export function useSessionMessagesLoadingOlder(sessionID: string) {
  return eventStore((s) => s._messageLoadingOlder[sessionID] ?? false);
}

// The message currently streaming into the session, or undefined when idle.
// Selects the message object itself, so unrelated message updates keep the same
// reference and do not re-render subscribers.
export function useActiveAssistantMessage(sessionID: string) {
  return eventStore((s) =>
    activeAssistant(s.session.message[sessionID] ?? EMPTY_MESSAGES),
  );
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

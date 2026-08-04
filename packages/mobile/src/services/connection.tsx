import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createClient, getClient } from "@/services/api";
import {
  createEventManager,
  destroyEventManager,
  getEventManager,
  type ConnectionStatus as EventConnectionStatus,
} from "@/services/event-manager";
import {
  getServerUrl,
  getServerPassword,
  setServerUrl,
  setServerPassword,
  clearServerConfig,
} from "@/services/server-store";
import { eventStore } from "@/stores/store";
import { handleEvent } from "@/stores/reducer";
import {
  hydrateSession,
  sync,
  syncLocation,
  syncSessionList,
  syncProjectList,
} from "@/stores/sync";

export type ConnectionStatus =
  | "loading"
  | "idle"
  | "checking"
  | "connected"
  | "error";

interface ConnectionValue {
  status: ConnectionStatus;
  error: string | null;
  url: string | null;
  connect: (url: string, password?: string) => void;
  retry: () => void;
  disconnect: () => void;
}

const ConnectionContext = createContext<ConnectionValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventStatus, setEventStatus] =
    useState<EventConnectionStatus>("disconnected");

  // Load stored credentials from SecureStore on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedUrl, storedPassword] = await Promise.all([
        getServerUrl(),
        getServerPassword(),
      ]);
      if (cancelled) return;
      if (storedUrl) {
        createClient(storedUrl, storedPassword ?? undefined);
        createEventManager(getClient());
        setUrl(storedUrl);
      }
      setInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Connect/disconnect the EventManager SSE stream when url changes
  useEffect(() => {
    if (!url) return;
    const mgr = getEventManager();

    const eventUnsub = mgr.onAny(handleEvent);
    mgr.connect();
    const statusUnsub = mgr.onStatusChange((ev) => {
      setEventStatus(ev.status);
      setEventError(ev.error ?? null);
      if (ev.status === "connected") {
        // The event feed is live-only, so recovery is a rehydration of every
        // previously-loaded session's projection. The event manager buffers
        // live events during the refetch and replays them in order once the
        // projection lands, so the store is never a mix of a stale snapshot
        // and overlapping live mutations. The global sync cache is cleared so
        // the eager catalog/session/project refetches actually run.
        sync.invalidate();
        void mgr
          .runHydrated(async () => {
            const active = await getClient().session.active();
            eventStore.setState((s) => {
              for (const [sessionID, session] of Object.entries(active)) {
                s.session.active[sessionID] = session.type;
              }
            });
            await Promise.all([
              ...Object.keys(eventStore.getState()._hydration).map((sessionID) =>
                hydrateSession(sessionID),
              ),
              syncLocation(),
              syncSessionList(),
              syncProjectList(),
            ]);
          })
          .catch((error) =>
            console.error("Failed to recover after reconnect", error),
          );
      }
    });
    return () => {
      eventUnsub();
      statusUnsub();
      mgr.disconnect();
    };
  }, [url]);

  const connect = useCallback((serverUrl: string, password?: string) => {
    createClient(serverUrl, password);
    createEventManager(getClient());
    setServerUrl(serverUrl).catch(console.error);
    if (password) setServerPassword(password).catch(console.error);
    setUrl(serverUrl);
  }, []);

  const retry = useCallback(() => {
    getEventManager().connect();
  }, []);

  const disconnect = useCallback(() => {
    destroyEventManager();
    clearServerConfig().catch(console.error);
    setUrl(null);
    setEventError(null);
    setEventStatus("disconnected");
  }, []);

  const derivedStatus: ConnectionStatus = !initialized
    ? "loading"
    : !url
      ? "idle"
      : eventStatus === "connected"
        ? "connected"
        : eventStatus === "connecting" || eventStatus === "reconnecting"
          ? "checking"
          : "error";

  return (
    <ConnectionContext.Provider
      value={{
        status: derivedStatus,
        error: eventError,
        url,
        connect,
        retry,
        disconnect,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx)
    throw new Error("useConnection must be used within ConnectionProvider");
  return ctx;
}

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
import { syncLocation, syncSessionList, syncProjectList } from "@/stores/sync";

export type ConnectionStatus =
  | "loading"
  | "idle"
  | "checking"
  | "connected"
  | "error";

interface ConnectionValue {
  status: ConnectionStatus;
  url: string | null;
  connect: (url: string, password?: string) => void;
  disconnect: () => void;
}

const ConnectionContext = createContext<ConnectionValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
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
      if (ev.status === "connected") {
        getClient()
          .session.active()
          .then((active: Record<string, unknown>) =>
            eventStore.setState((s) => {
              for (const sessionID of Object.keys(active)) {
                s.session.active[sessionID] = "running";
              }
            }),
          )
          .catch(() => {});
        syncLocation().catch((e) =>
          console.error("Failed to preload location", e),
        );
        syncSessionList().catch((e) =>
          console.error("Failed to preload sessions", e),
        );
        syncProjectList().catch((e) =>
          console.error("Failed to preload projects", e),
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

  const disconnect = useCallback(() => {
    destroyEventManager();
    clearServerConfig().catch(console.error);
    setUrl(null);
    setEventStatus("disconnected");
  }, []);

  const derivedStatus: ConnectionStatus = !initialized
    ? "loading"
    : !url
      ? "idle"
      : eventStatus === "connected"
        ? "connected"
        : eventStatus === "connecting" ||
            eventStatus === "reconnecting" ||
            eventStatus === "disconnected"
          ? "checking"
          : "error";

  return (
    <ConnectionContext.Provider
      value={{ status: derivedStatus, url, connect, disconnect }}
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

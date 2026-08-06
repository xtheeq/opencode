import { type ReactNode, useEffect } from "react";
import { createClient } from "@/services/api";
import {
  createEventManager,
  destroyEventManager,
  getEventManager,
} from "@/services/event-manager";
import {
  getServerUrl,
  getServerPassword,
  setServerUrl,
  setServerPassword,
  clearServerConfig,
} from "@/services/server-store";
import { useClient } from "@/hooks/use-store";
import { eventStore, getClient } from "@/stores/store";
import { handleEvent } from "@/stores/reducer";
import { recoverConnection } from "@/stores/sync";

export function connect(serverUrl: string, password?: string) {
  eventStore.setState((s) => {
    s._client = createClient(serverUrl, password);
  });
  createEventManager(getClient());
  setServerUrl(serverUrl).catch(console.error);
  if (password) setServerPassword(password).catch(console.error);
}

export function retry() {
  getEventManager().connect();
}

export function disconnect() {
  destroyEventManager();
  clearServerConfig().catch(console.error);
  eventStore.setState((s) => {
    s._client = null;
  });
}

// Mounts the connection lifecycle: loads stored credentials, then wires the
// event stream once a server is configured. Client and status live in the
// store; consumers read them through use-store hooks.
export function ConnectionManager({ children }: { children: ReactNode }) {
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
        eventStore.setState((s) => {
          s._client = createClient(storedUrl, storedPassword ?? undefined);
        });
        createEventManager(getClient());
      }
      eventStore.setState((s) => {
        s._serverConfigLoaded = true;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const client = useClient();

  // Connect/disconnect the EventManager SSE stream when a server is configured
  useEffect(() => {
    if (!client) return;
    const mgr = getEventManager();

    const eventUnsub = mgr.onAny(handleEvent);
    mgr.connect();
    const statusUnsub = mgr.onStatusChange((ev) => {
      eventStore.setState((s) => {
        s.connection = {
          status: ev.status,
          attempt: ev.attempt,
          error: ev.error,
        };
      });
      if (ev.status === "connected") {
        void recoverConnection(mgr).catch((error) =>
          console.error("Failed to recover after reconnect", error),
        );
      }
    });
    return () => {
      eventUnsub();
      statusUnsub();
      mgr.disconnect();
    };
  }, [client]);

  return <>{children}</>;
}

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
  getLocation,
  setServerUrl,
  setServerPassword,
  clearServerConfig,
} from "@/services/server-store";
import { useClient } from "@/hooks/use-store";
import { eventStore, getClient } from "@/stores/store";
import { handleEvent } from "@/stores/reducer";
import { recoverConnection } from "@/stores/sync";
import { dismissCueKey, raiseCue } from "@/stores/cues";
import { CONNECTION_CUE_KEY, connectionCue } from "@/utils/connection-cue";

export function connect(serverUrl: string, password?: string) {
  dismissCueKey(CONNECTION_CUE_KEY);
  eventStore.setState((s) => {
    s._client = createClient(serverUrl, password);
    s._serverUrl = serverUrl;
    s.connection = { status: "disconnected", attempt: 0, everConnected: false };
  });
  createEventManager(getClient());
  setServerUrl(serverUrl).catch(console.error);
  if (password) setServerPassword(password).catch(console.error);
}

export function retry() {
  getEventManager().connect();
}

// Reset the slice before destroying the manager so its final "disconnected"
// status event cannot raise a "Connection lost" cue for a user-initiated
// disconnect.
export function disconnect() {
  eventStore.setState((s) => {
    s._client = null;
    s._serverUrl = null;
    s._defaultLocation = { directory: "" };
    s.connection = { status: "disconnected", attempt: 0, everConnected: false };
  });
  dismissCueKey(CONNECTION_CUE_KEY);
  destroyEventManager();
  clearServerConfig().catch(console.error);
}

// Mounts the connection lifecycle: loads stored credentials, then wires the
// event stream once a server is configured. Client and status live in the
// store; consumers read them through use-store hooks.
export function ConnectionManager({ children }: { children: ReactNode }) {
  // Load stored credentials from SecureStore on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedUrl, storedPassword, storedLocation] = await Promise.all([
        getServerUrl(),
        getServerPassword(),
        getLocation(),
      ]);
      if (cancelled) return;
      if (storedUrl) {
        eventStore.setState((s) => {
          s._client = createClient(storedUrl, storedPassword ?? undefined);
          s._serverUrl = storedUrl;
          // Restore the selected project before the event stream connects so
          // session creation and catalog sync target the user's directory
          // rather than the server daemon's process cwd. Falls back to the
          // server-resolved default when nothing is stored.
          if (storedLocation) s._defaultLocation = storedLocation;
        });
        createEventManager(getClient());
      }
      eventStore.setState((s) => {
        s._serverConfigLoaded = true;
        s._locationLoaded = true;
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
      const cue = connectionCue(
        ev,
        eventStore.getState().connection.everConnected,
        { retry, disconnect },
      );
      eventStore.setState((s) => {
        s.connection = {
          status: ev.status,
          attempt: ev.attempt,
          error: ev.error,
          everConnected: s.connection.everConnected || ev.status === "connected",
        };
      });
      if (cue) raiseCue(cue);
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

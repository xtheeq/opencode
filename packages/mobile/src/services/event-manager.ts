import { AppState, type AppStateStatus } from "react-native";
import type { QueryClient } from "@tanstack/react-query";
import type { OpenCodeClient, V2Event } from "@opencode-ai/client/promise";

type EventMap = { [K in V2Event["type"]]: Extract<V2Event, { type: K }> };

export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected";

export type ConnectionStatusEvent = {
  readonly type: "connection";
  readonly status: ConnectionStatus;
  readonly attempt: number;
  readonly error?: string;
};

export type TransportReconnect = (
  signal: AbortSignal,
) => Promise<{ api: OpenCodeClient }>;

const BASE_DELAY = 1_000;
const MAX_DELAY = 30_000;
const CONNECT_TIMEOUT = 2_000;
const CONNECTION_HISTORY_LIMIT = 50;

let instance: EventManager | null = null;

export function getEventManager(): EventManager {
  if (!instance) throw new Error("EventManager not initialized");
  return instance;
}

export function createEventManager(
  client: OpenCodeClient,
  opts?: {
    onReconnected?: () => void;
    reconnect?: TransportReconnect;
    queryClient?: QueryClient;
  },
): EventManager {
  instance?.disconnect();
  instance = new EventManager(client, opts);
  return instance;
}

export function destroyEventManager() {
  const inst = instance;
  instance = null;
  inst?.disconnect();
}

class EventManager {
  private client: OpenCodeClient;
  private stream: AbortController | null = null;
  private lifecycle = new AbortController();
  private isActive = false;
  private paused = false;
  private status: ConnectionStatus = "disconnected";
  private attempt = 0;
  private statusListeners = new Set<(event: ConnectionStatusEvent) => void>();
  private typeListeners = new Map<string, Set<(event: V2Event) => void>>();
  private anyListeners = new Set<(event: V2Event) => void>();
  private appStateUnsub?: () => void;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private history: ConnectionStatusEvent[] = [];

  private onReconnected?: () => void;
  private reconnect?: TransportReconnect;
  private queryClient?: QueryClient;

  constructor(
    client: OpenCodeClient,
    opts?: {
      onReconnected?: () => void;
      reconnect?: TransportReconnect;
      queryClient?: QueryClient;
    },
  ) {
    this.client = client;
    this.onReconnected = opts?.onReconnected;
    this.reconnect = opts?.reconnect;
    this.queryClient = opts?.queryClient;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getHistory(): ReadonlyArray<ConnectionStatusEvent> {
    return this.history;
  }

  onStatusChange(listener: (event: ConnectionStatusEvent) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: ConnectionStatus, error?: string) {
    const prevStatus = this.status;
    this.status = status;
    const event: ConnectionStatusEvent = {
      type: "connection",
      status,
      attempt: this.attempt,
      error,
    };
    this.history.push(event);
    if (this.history.length > CONNECTION_HISTORY_LIMIT) this.history.shift();
    for (const listener of this.statusListeners) {
      try {
        listener(event);
      } catch {
        /* guard against consumer throw */
      }
    }
    if (status === "connected" && prevStatus !== "connected") {
      this.attempt = 0;
      console.info("[event-manager] reconnected");
      this.queryClient?.invalidateQueries();
      this.onReconnected?.();
    }
  }

  on<K extends V2Event["type"]>(
    type: K,
    handler: (event: EventMap[K]) => void,
  ): () => void {
    const handlers =
      this.typeListeners.get(type) ?? new Set<(event: V2Event) => void>();
    handlers.add(handler as (event: V2Event) => void);
    this.typeListeners.set(type, handlers);
    return () => {
      handlers.delete(handler as (event: V2Event) => void);
    };
  }

  onAny(handler: (event: V2Event) => void): () => void {
    this.anyListeners.add(handler);
    return () => {
      this.anyListeners.delete(handler);
    };
  }

  private emit(event: V2Event) {
    this.typeListeners.get(event.type)?.forEach((handler) => {
      try {
        handler(event);
      } catch {
        /* guard against consumer throw */
      }
    });
    this.anyListeners.forEach((handler) => {
      try {
        handler(event);
      } catch {
        /* guard against consumer throw */
      }
    });
  }

  async connect(): Promise<void> {
    if (this.isActive) return;
    this.isActive = true;
    this.paused = false;
    this.lifecycle.abort();
    this.lifecycle = new AbortController();
    this.attempt = 0;
    this.setStatus("connecting");
    this.start();
    this.appStateUnsub = AppState.addEventListener(
      "change",
      this.handleAppStateChange,
    ).remove;
  }

  disconnect() {
    this.isActive = false;
    this.paused = false;
    this.lifecycle.abort();
    this.stream?.abort();
    this.stream = null;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.appStateUnsub?.();
    this.appStateUnsub = undefined;
    this.setStatus("disconnected");
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === "background" || nextAppState === "inactive") {
      console.info("[event-manager] app backgrounded, pausing SSE");
      this.paused = true;
      this.stream?.abort();
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    } else if (nextAppState === "active" && this.isActive && this.paused) {
      this.paused = false;
      console.info("[event-manager] app foregrounded, resuming SSE");
      this.setStatus("connecting");
      this.start();
    }
  };

  private async connectOnce(
    signal: AbortSignal,
  ): Promise<{ error?: Error; connectedAt?: number }> {
    let connectedAt: number | undefined;

    const request = new AbortController();
    const cancel = () => request.abort(signal.reason);
    const timeout = setTimeout(
      () => request.abort(new Error("Timed out connecting to server")),
      CONNECT_TIMEOUT,
    );
    signal.addEventListener("abort", cancel, { once: true });

    try {
      console.info("[event-manager] event stream connecting", {
        attempt: this.attempt,
      });

      const iterator = this.client.event
        .subscribe({ signal: request.signal })
        [Symbol.asyncIterator]();
      const first = await iterator.next();

      if (signal.aborted) return { error: undefined, connectedAt };
      if (first.done) {
        const error =
          request.signal.reason instanceof Error
            ? request.signal.reason
            : new Error("Event stream disconnected");
        return { error, connectedAt };
      }
      if (first.value.type !== "server.connected") {
        return {
          error: new Error("Event stream did not start with server.connected"),
          connectedAt,
        };
      }

      clearTimeout(timeout);
      connectedAt = Date.now();
      console.info("[event-manager] event stream connected");
      this.emit(first.value);
      this.setStatus("connected");

      while (!signal.aborted) {
        const event = await iterator.next();
        if (signal.aborted) return { error: undefined, connectedAt };
        if (event.done)
          return { error: new Error("Event stream disconnected"), connectedAt };
        if ("durable" in event.value)
          console.debug("[event-manager] event", {
            type: event.value.type,
            aggregateID: event.value.durable.aggregateID,
            seq: event.value.durable.seq,
          });
        this.emit(event.value);
      }

      return { error: undefined, connectedAt };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error(String(error)),
        connectedAt,
      };
    } finally {
      request.abort();
      clearTimeout(timeout);
      signal.removeEventListener("abort", cancel);
    }
  }

  private start() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;

    const controller = new AbortController();
    const signal = this.lifecycle.signal;
    this.stream?.abort();
    this.stream = controller;

    const loop = async () => {
      let attempt = 0;
      while (!signal.aborted && !controller.signal.aborted) {
        const result = await this.connectOnce(controller.signal);
        if (signal.aborted || controller.signal.aborted) return;

        if (
          result.connectedAt !== undefined &&
          Date.now() - result.connectedAt >= 1_000
        ) {
          attempt = 0;
        }

        attempt += 1;
        this.attempt = attempt;

        const errorMessage = result.error?.message ?? "Unknown error";
        console.info("[event-manager] event stream disconnected", {
          attempt,
          error: errorMessage,
        });
        this.setStatus("reconnecting", errorMessage);

        // Re-resolve the transport so the client can pick up a new address
        // if the server restarted on a different port.
        if (this.reconnect) {
          const next = await this.reconnect(controller.signal).catch(
            (error) => {
              if (!controller.signal.aborted) {
                console.info("[event-manager] transport re-resolution failed", {
                  attempt,
                  error: String(error),
                });
              }
            },
          );
          if (signal.aborted || controller.signal.aborted) return;
          if (next) {
            this.client = next.api;
            if (attempt === 1) continue;
          }
        }

        const delay = Math.min(BASE_DELAY * 2 ** (attempt - 1), MAX_DELAY);
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, delay);
          this.reconnectTimer = timer;
          controller.signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true },
          );
        });
      }
    };

    loop();
  }
}

export default EventManager;

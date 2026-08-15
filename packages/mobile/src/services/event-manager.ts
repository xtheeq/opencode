import { AppState, type AppStateStatus } from "react-native";
import { type OpenCodeClient, type V2Event } from "@opencode-ai/client/promise";
import type { ConnectionStatus } from "@/types/connection";
import { isTransientError } from "@/services/transient-error";
import { coalesceEvents } from "@/services/event-coalesce";

type EventMap = { [K in V2Event["type"]]: Extract<V2Event, { type: K }> };

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
const MAX_RECONNECT_ATTEMPTS = 6;
const CONNECT_TIMEOUT = 2_000;
const FLUSH_INTERVAL_MS = 16;
// Bounds how long a hydration window may hold live events before the UI
// unblocks; a hung projection fetch must never freeze event dispatch.
const HYDRATION_TIMEOUT_MS = 10_000;

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
  private pending: V2Event[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | undefined;
  private hydrating = false;

  private onReconnected?: () => void;
  private reconnect?: TransportReconnect;

  constructor(
    client: OpenCodeClient,
    opts?: {
      onReconnected?: () => void;
      reconnect?: TransportReconnect;
    },
  ) {
    this.client = client;
    this.onReconnected = opts?.onReconnected;
    this.reconnect = opts?.reconnect;
  }

  getStatus(): ConnectionStatus {
    return this.status;
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
    this.pending.push(event);
    if (this.flushTimer || this.hydrating) return;
    this.flushTimer = setTimeout(() => this.flushEvents(), FLUSH_INTERVAL_MS);
  }

  private flushEvents() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    if (this.hydrating) return;
    const events = this.pending;
    this.pending = [];
    const coalesced = coalesceEvents(events);
    for (const event of coalesced) this.dispatch(event);
  }

  // Runs a refetch with event dispatch suspended: live events accumulate in
  // order and replay after the projection lands, so the store is always a
  // clean fold of the hydrated projection plus events since it started.
  // A failed or timed-out hydration still releases buffered events.
  async runHydrated(fn: () => Promise<void>): Promise<void> {
    if (this.hydrating) {
      await fn();
      return;
    }
    this.hydrating = true;
    try {
      const timeout = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          clearTimeout(timer);
          reject(new Error("Hydration timed out"));
        }, HYDRATION_TIMEOUT_MS);
      });
      await Promise.race([fn(), timeout]);
    } finally {
      this.hydrating = false;
      this.flushEvents();
    }
  }

  private dispatch(event: V2Event) {
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
    clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    this.pending = [];
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
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
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

        // Hard errors (wrong endpoint, auth, content type) won't heal by
        // waiting; surface them instead of retrying.
        if (!isTransientError(result.error)) {
          this.giveUp(errorMessage);
          return;
        }

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

        // Bounded backoff: keep retrying a down server but never hide a bad
        // address behind endless retries.
        if (attempt >= MAX_RECONNECT_ATTEMPTS) {
          this.giveUp(errorMessage);
          return;
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

  private giveUp(error: string) {
    this.isActive = false;
    this.setStatus("disconnected", error);
  }
}

export default EventManager;

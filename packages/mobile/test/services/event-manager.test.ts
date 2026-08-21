import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { ClientError } from "@opencode-ai/client/promise";
import type { OpenCodeClient, V2Event } from "@opencode-ai/client/promise";

mock.module("react-native", () => ({
  AppState: {
    addEventListener: () => ({ remove: () => {} }),
  },
}));

let createEventManager: (typeof import("@/services/event-manager"))["createEventManager"];
let destroyEventManager: (typeof import("@/services/event-manager"))["destroyEventManager"];

beforeAll(async () => {
  const module = await import("@/services/event-manager");
  createEventManager = module.createEventManager;
  destroyEventManager = module.destroyEventManager;
});

type Feed = ReturnType<typeof createFeed>;

function createFeed() {
  const values: V2Event[] = [];
  const errors: unknown[] = [];
  let closed = false;
  let wake: (() => void) | undefined;
  const stream = (async function* (): AsyncGenerator<V2Event, void, unknown> {
    while (!closed || values.length > 0) {
      if (errors.length > 0) throw errors.shift();
      if (values.length === 0) {
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        continue;
      }
      const value = values.shift();
      if (value) yield value;
    }
  })();
  return {
    stream,
    push(value: V2Event) {
      values.push(value);
      wake?.();
      wake = undefined;
    },
    fail(error: unknown) {
      errors.push(error);
      wake?.();
      wake = undefined;
    },
    close() {
      closed = true;
      wake?.();
      wake = undefined;
    },
  };
}

function client(feed: Feed): OpenCodeClient {
  return {
    event: { subscribe: () => feed.stream },
  } as unknown as OpenCodeClient;
}

const connected = (): V2Event =>
  ({ id: "evt_connected", type: "server.connected", data: {} }) as V2Event;

const renamed = (): V2Event =>
  ({
    id: "evt_renamed",
    type: "session.renamed",
    data: { sessionID: "ses_1", title: "New" },
  }) as V2Event;

const synthetic = (): V2Event =>
  ({
    id: "evt_synthetic",
    type: "session.synthetic",
    data: { sessionID: "ses_1", text: "hello" },
  }) as V2Event;

const textDelta = (): V2Event =>
  ({
    id: "evt_text_delta",
    type: "session.text.delta",
    data: { sessionID: "ses_1", assistantMessageID: "msg_1", ordinal: 0, delta: "hi" },
  }) as V2Event;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => {
  destroyEventManager();
});

describe("EventManager handshake", () => {
  test("connects after a server.connected first event", async () => {
    const feed = createFeed();
    const mgr = createEventManager(client(feed));
    const dispatched: V2Event[] = [];
    mgr.onAny((event) => dispatched.push(event));

    await mgr.connect();
    feed.push(connected());
    await sleep(30);

    expect(mgr.getStatus()).toBe("connected");
    expect(dispatched.map((event) => event.type)).toEqual(["server.connected"]);
  });

  test("hard errors stop the reconnect loop immediately", async () => {
    const feed = createFeed();
    const mgr = createEventManager(client(feed));
    const statuses: string[] = [];
    mgr.onStatusChange((ev) => statuses.push(ev.status));

    await mgr.connect();
    feed.fail(new ClientError("UnexpectedStatus", { cause: { status: 401 } }));
    await sleep(30);

    expect(mgr.getStatus()).toBe("disconnected");
    expect(statuses).toEqual(["connecting", "reconnecting", "disconnected"]);
  });

  test("transient errors retry and recover", async () => {
    const feed = createFeed();
    const mgr = createEventManager(client(feed), {
      reconnect: async () => ({ api: client(feed) }),
    });

    await mgr.connect();
    // First event is not server.connected -> transient handshake error.
    feed.push(renamed());
    await sleep(10);
    feed.push(connected());
    await sleep(30);

    expect(mgr.getStatus()).toBe("connected");
  });
});

describe("EventManager hydration window", () => {
  test("buffers live events and replays them in order after the window", async () => {
    const feed = createFeed();
    const mgr = createEventManager(client(feed));
    const dispatched: V2Event[] = [];
    mgr.onAny((event) => dispatched.push(event));

    await mgr.connect();
    feed.push(connected());
    await sleep(30);

    const order: string[] = [];
    await mgr.runHydrated(async () => {
      feed.push(renamed());
      await sleep(10);
      expect(dispatched.map((event) => event.type)).toEqual([
        "server.connected",
      ]);
      order.push("window");
    });
    order.push("after");

    expect(order).toEqual(["window", "after"]);
    expect(dispatched.map((event) => event.type)).toEqual([
      "server.connected",
      "session.renamed",
    ]);
  });

  test("nested runHydrated keeps buffering until the outer window closes", async () => {
    const feed = createFeed();
    const mgr = createEventManager(client(feed));
    const dispatched: V2Event[] = [];
    mgr.onAny((event) => dispatched.push(event));

    await mgr.connect();
    feed.push(connected());
    await sleep(30);

    await mgr.runHydrated(async () => {
      feed.push(renamed());
      await sleep(5);
      await mgr.runHydrated(async () => {
        feed.push(synthetic());
        await sleep(5);
      });
      expect(dispatched.length).toBe(1);
    });

    expect(dispatched.map((event) => event.type)).toEqual([
      "server.connected",
      "session.renamed",
      "session.synthetic",
    ]);
  });

  test("a failed hydration still releases buffered events", async () => {
    const feed = createFeed();
    const mgr = createEventManager(client(feed));
    const dispatched: V2Event[] = [];
    mgr.onAny((event) => dispatched.push(event));

    await mgr.connect();
    feed.push(connected());
    await sleep(30);

    await expect(
      mgr.runHydrated(async () => {
        feed.push(renamed());
        await sleep(10);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(dispatched.map((event) => event.type)).toEqual([
      "server.connected",
      "session.renamed",
    ]);
  });
});

describe("EventManager flush cadence", () => {
  test("delta events batch on the slower cadence instead of flushing immediately", async () => {
    const feed = createFeed();
    const mgr = createEventManager(client(feed));
    const dispatched: V2Event[] = [];
    mgr.onAny((event) => dispatched.push(event));

    await mgr.connect();
    feed.push(connected());
    await sleep(30);

    feed.push(textDelta());
    await sleep(20);
    expect(dispatched.map((event) => event.type)).toEqual(["server.connected"]);

    await sleep(120);
    expect(dispatched.map((event) => event.type)).toEqual([
      "server.connected",
      "session.text.delta",
    ]);
  });

  test("a structural event flushes queued deltas immediately, in order", async () => {
    const feed = createFeed();
    const mgr = createEventManager(client(feed));
    const dispatched: V2Event[] = [];
    mgr.onAny((event) => dispatched.push(event));

    await mgr.connect();
    feed.push(connected());
    await sleep(30);

    feed.push(textDelta());
    await sleep(10);
    feed.push(renamed());
    await sleep(30);

    expect(dispatched.map((event) => event.type)).toEqual([
      "server.connected",
      "session.text.delta",
      "session.renamed",
    ]);
  });
});

import { beforeEach, describe, expect, test } from "bun:test";
import type { OpenCodeClient } from "@opencode-ai/client/promise";
import { eventStore } from "@/stores/store";
import { recoverConnection, sync } from "@/stores/sync";

const loc = { directory: "", workspaceID: undefined };

const fakeClient = {
  session: {
    active: async () => ({ ses_active: { type: "running" } }),
    get: async ({ sessionID }: { sessionID: string }) => ({
      id: sessionID,
      title: "Session",
      time: { created: 0, updated: 0 },
    }),
    inbox: { list: async () => [] },
    list: async () => ({ data: [] }),
  },
  message: {
    list: async () => ({ data: [] }),
  },
  permission: {
    list: async () => [],
  },
  form: {
    list: async () => [],
    request: { list: async () => ({ location: loc, data: [] }) },
  },
  location: {
    get: async () => loc,
  },
  agent: { list: async () => ({ location: loc, data: [] }) },
  command: { list: async () => ({ location: loc, data: [] }) },
  integration: { list: async () => ({ location: loc, data: [] }) },
  mcp: {
    list: async () => ({ location: loc, data: [] }),
    resource: { catalog: async () => ({ location: loc, data: [] }) },
  },
  model: { list: async () => ({ location: loc, data: [] }) },
  provider: { list: async () => ({ location: loc, data: [] }) },
  reference: { list: async () => ({ location: loc, data: [] }) },
  shell: { list: async () => ({ location: loc, data: [] }) },
  skill: { list: async () => ({ location: loc, data: [] }) },
  websearch: { providers: async () => ({ location: loc, data: [] }) },
  project: { list: async () => [] },
};

const runHydrated = async (fn: () => Promise<void>) => fn();

beforeEach(() => {
  sync.invalidate();
  eventStore.setState((s) => {
    s.session = {
      info: {},
      family: {},
      active: {},
      message: {},
      pending: {},
      input: {},
      blocker: {},
      autoApprove: {},
    };
    s.project = { info: {}, permission: {} };
    s.location = {};
    s._hydration = {};
    s._loadedSessions = false;
    s._defaultLocation = { directory: "" };
    s._client = fakeClient as unknown as OpenCodeClient;
  });
});

describe("recoverConnection", () => {
  test("invalidates the sync cache so eager refetches rerun", async () => {
    let loads = 0;
    await sync.run("key", async () => {
      loads += 1;
    });

    await recoverConnection({ runHydrated });

    await sync.run("key", async () => {
      loads += 1;
    });
    expect(loads).toBe(2);
  });

  test("records active sessions and rehydrates previously-loaded sessions", async () => {
    eventStore.setState((s) => {
      s._hydration["ses_1"] = "loaded";
    });

    await recoverConnection({ runHydrated });

    const store = eventStore.getState();
    expect(store.session.active["ses_active"]).toBe("running");
    expect(store.session.info["ses_1"]?.id).toBe("ses_1");
    expect(store._hydration["ses_1"]).toBe("loaded");
  });

  test("rejects when the hydration window fails", async () => {
    await expect(
      recoverConnection({
        runHydrated: async () => {
          throw new Error("hydration window failed");
        },
      }),
    ).rejects.toThrow("hydration window failed");
  });
});

describe("connection status invalidation", () => {
  test("a transition to connected keeps the cache valid", async () => {
    let loads = 0;
    await sync.run("key", async () => {
      loads += 1;
    });

    eventStore.setState((s) => {
      s.connection = { status: "connected", attempt: 0, everConnected: true };
    });

    await sync.run("key", async () => {
      loads += 1;
    });
    expect(loads).toBe(1);
  });

  test("a status change away from connected invalidates cached reads", async () => {
    let loads = 0;
    await sync.run("key", async () => {
      loads += 1;
    });

    eventStore.setState((s) => {
      s.connection = { status: "connected", attempt: 0, everConnected: true };
    });
    eventStore.setState((s) => {
      s.connection = {
        status: "reconnecting",
        attempt: 1,
        everConnected: true,
      };
    });

    await sync.run("key", async () => {
      loads += 1;
    });
    expect(loads).toBe(2);
  });
});

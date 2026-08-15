import { beforeEach, describe, expect, mock, test } from "bun:test";
import type {
  OpenCodeClient,
  SessionInboxInfo,
  SessionMessageInfo,
} from "@opencode-ai/client/promise";

const calls = {
  sessionGet: 0,
  messageList: 0,
  inboxList: 0,
  permissionList: 0,
};

const sessionInfo = (sessionID: string) => ({
  id: sessionID,
  title: "Session",
  time: { created: 0, updated: 0 },
});

const fakeClient = {
  session: {
    get: async ({ sessionID }: { sessionID: string }) => {
      calls.sessionGet += 1;
      return sessionInfo(sessionID);
    },
    inbox: {
      list: async () => {
        calls.inboxList += 1;
        return [];
      },
    },
  },
  message: {
    list: async () => {
      calls.messageList += 1;
      return { data: [] };
    },
  },
  permission: {
    list: async () => {
      calls.permissionList += 1;
      return [];
    },
  },
  form: {
    list: async () => [],
  },
};

let hydrateSession: (typeof import("@/stores/sync"))["hydrateSession"];
let sync: (typeof import("@/stores/sync"))["sync"];
let eventStore: (typeof import("@/stores/store"))["eventStore"];

beforeEach(async () => {
  const syncModule = await import("@/stores/sync");
  const storeModule = await import("@/stores/store");
  hydrateSession = syncModule.hydrateSession;
  sync = syncModule.sync;
  eventStore = storeModule.eventStore;
  calls.sessionGet = 0;
  calls.messageList = 0;
  calls.inboxList = 0;
  calls.permissionList = 0;
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
    s._hydration = {};
    s._client = fakeClient as unknown as OpenCodeClient;
  });
});

function cachedMessage(id: string): SessionMessageInfo {
  return {
    id,
    type: "user",
    text: `text-${id}`,
    time: { created: 0 },
  } as SessionMessageInfo;
}

function pendingUser(id: string): SessionInboxInfo {
  return {
    id,
    sessionID: "ses_1",
    timeCreated: 0,
    type: "user",
    payload: { text: `text-${id}` },
    delivery: "queue",
  } as SessionInboxInfo;
}

describe("hydrateSession", () => {
  test("loads every projection and marks the session hydrated", async () => {
    await hydrateSession("ses_1");

    const store = eventStore.getState();
    expect(store._hydration["ses_1"]).toBe("loaded");
    expect(store.session.info["ses_1"]?.id).toBe("ses_1");
    expect(store.session.message["ses_1"]).toEqual([]);
    expect(store.session.pending["ses_1"]).toEqual([]);
    expect(store.session.blocker["ses_1"]).toEqual([]);
    expect(calls).toEqual({
      sessionGet: 1,
      messageList: 1,
      inboxList: 1,
      permissionList: 1,
    });
  });

  test("keeps optimistic unpromoted inputs across a refetch", async () => {
    eventStore.setState((s) => {
      s.session.pending["ses_1"] = [pendingUser("msg_p")];
      s.session.input["ses_1"] = ["msg_p"];
      s.session.message["ses_1"] = [cachedMessage("msg_p")];
    });

    await hydrateSession("ses_1");

    const messages = eventStore.getState().session.message["ses_1"] ?? [];
    expect(messages.some((message) => message.id === "msg_p")).toBe(true);
  });

  test("drops rows the server no longer has", async () => {
    eventStore.setState((s) => {
      s.session.message["ses_1"] = [cachedMessage("msg_gone")];
    });

    await hydrateSession("ses_1");

    expect(eventStore.getState().session.message["ses_1"]).toEqual([]);
  });

  test("dedupes concurrent hydrations of the same session", async () => {
    await Promise.all([hydrateSession("ses_1"), hydrateSession("ses_1")]);

    expect(calls.sessionGet).toBe(1);
    expect(calls.messageList).toBe(1);
  });

  test("a failed hydration keeps cached rows and still settles loaded", async () => {
    eventStore.setState((s) => {
      s._client = {
        ...fakeClient,
        message: {
          list: async () => {
            throw new Error("network connection was lost");
          },
        },
      } as unknown as OpenCodeClient;
      s.session.message["ses_1"] = [cachedMessage("msg_cached")];
    });

    await hydrateSession("ses_1");

    const store = eventStore.getState();
    expect(store._hydration["ses_1"]).toBe("loaded");
    expect(store.session.message["ses_1"]).toEqual([
      cachedMessage("msg_cached"),
    ]);
  });
});

describe("sync cache", () => {
  test("a completed key short-circuits until invalidated", async () => {
    let loads = 0;
    await sync.run("key", async () => {
      loads += 1;
    });
    await sync.run("key", async () => {
      loads += 1;
    });
    expect(loads).toBe(1);

    sync.invalidate("key");
    await sync.run("key", async () => {
      loads += 1;
    });
    expect(loads).toBe(2);
  });

  test("global invalidate clears every key", async () => {
    let loads = 0;
    await sync.run("a", async () => {
      loads += 1;
    });
    await sync.run("b", async () => {
      loads += 1;
    });
    sync.invalidate();
    await sync.run("a", async () => {
      loads += 1;
    });
    await sync.run("b", async () => {
      loads += 1;
    });
    expect(loads).toBe(4);
  });

  test("concurrent runs of the same key are deduped", async () => {
    let loads = 0;
    await Promise.all([
      sync.run("key", async () => {
        loads += 1;
      }),
      sync.run("key", async () => {
        loads += 1;
      }),
    ]);
    expect(loads).toBe(1);
  });
});

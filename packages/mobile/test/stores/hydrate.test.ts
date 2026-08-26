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
      return messageListResult;
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
let loadOlderMessages: (typeof import("@/stores/sync"))["loadOlderMessages"];
let removeSession: (typeof import("@/stores/sync"))["removeSession"];
let sync: (typeof import("@/stores/sync"))["sync"];
let eventStore: (typeof import("@/stores/store"))["eventStore"];
let messageIndex: (typeof import("@/stores/store"))["messageIndex"];

let messageListResult: {
  data: SessionMessageInfo[];
  cursor: { next?: string };
};

beforeEach(async () => {
  const syncModule = await import("@/stores/sync");
  const storeModule = await import("@/stores/store");
  hydrateSession = syncModule.hydrateSession;
  loadOlderMessages = syncModule.loadOlderMessages;
  removeSession = syncModule.removeSession;
  sync = syncModule.sync;
  eventStore = storeModule.eventStore;
  messageIndex = storeModule.messageIndex;
  calls.sessionGet = 0;
  calls.messageList = 0;
  calls.inboxList = 0;
  calls.permissionList = 0;
  messageListResult = { data: [], cursor: {} };
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
    s._messageCursor = {};
    s._messageLoadingOlder = {};
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

describe("loadOlderMessages", () => {
  test("hydration captures the older-history cursor", async () => {
    messageListResult = {
      data: [cachedMessage("msg_new")],
      cursor: { next: "cur_older" },
    };

    await hydrateSession("ses_1");

    expect(eventStore.getState()._messageCursor["ses_1"]).toBe("cur_older");
  });

  test("prepends the older page, dedupes, and advances the cursor", async () => {
    eventStore.setState((s) => {
      s.session.message["ses_1"] = [cachedMessage("msg_new")];
      s._messageCursor["ses_1"] = "cur_1";
    });
    messageListResult = {
      data: [cachedMessage("msg_new"), cachedMessage("msg_mid"), cachedMessage("msg_old")],
      cursor: { next: "cur_2" },
    };

    await loadOlderMessages("ses_1");

    const store = eventStore.getState();
    expect(store.session.message["ses_1"].map((m) => m.id)).toEqual([
      "msg_old",
      "msg_mid",
      "msg_new",
    ]);
    expect(store._messageCursor["ses_1"]).toBe("cur_2");
    expect(store._messageLoadingOlder["ses_1"]).toBe(false);
    expect(messageIndex.get("ses_1")?.get("msg_old")).toBe(0);
    expect(messageIndex.get("ses_1")?.get("msg_new")).toBe(2);
  });

  test("a no-cursor session is exhausted and never refetches", async () => {
    await loadOlderMessages("ses_1");

    expect(calls.messageList).toBe(0);
  });

  test("concurrent loads share one page fetch", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    eventStore.setState((s) => {
      s._client = {
        ...fakeClient,
        message: {
          list: async () => {
            calls.messageList += 1;
            await gate;
            return { data: [], cursor: {} };
          },
        },
      } as unknown as OpenCodeClient;
      s.session.message["ses_1"] = [cachedMessage("msg_a")];
      s._messageCursor["ses_1"] = "cur";
    });

    const first = loadOlderMessages("ses_1");
    const second = loadOlderMessages("ses_1");
    release();
    await Promise.all([first, second]);

    expect(calls.messageList).toBe(1);
  });

  test("a failed page keeps state and clears the loading flag", async () => {
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
      s._messageCursor["ses_1"] = "cur";
    });

    await loadOlderMessages("ses_1");

    const store = eventStore.getState();
    expect(store.session.message["ses_1"].map((m) => m.id)).toEqual([
      "msg_cached",
    ]);
    expect(store._messageCursor["ses_1"]).toBe("cur");
    expect(store._messageLoadingOlder["ses_1"]).toBe(false);
  });

  test("removeSession clears the pagination keys", async () => {
    eventStore.setState((s) => {
      s._messageCursor["ses_1"] = "cur";
      s._messageLoadingOlder["ses_1"] = true;
    });

    eventStore.setState((s) => removeSession(s, "ses_1"));

    const store = eventStore.getState();
    expect(store._messageCursor["ses_1"]).toBeUndefined();
    expect(store._messageLoadingOlder["ses_1"]).toBeUndefined();
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

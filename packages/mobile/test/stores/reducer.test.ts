import { describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode-ai/client/promise";
import { eventStore, messageIndex } from "@/stores/store";
import { handleEvent } from "@/stores/reducer";

const permissionAsked = (overrides: Partial<V2Event> = {}): V2Event =>
  ({
    type: "permission.asked",
    id: "evt_1",
    created: 0,
    data: { id: "per_1", sessionID: "ses_1", action: "read", resources: [] },
    ...overrides,
  }) as V2Event;

const inboxEnqueued = (
  sessionID: string,
  inboxID: string,
  delivery: "steer" | "queue" = "queue",
): V2Event =>
  ({
    type: "session.inbox.enqueued",
    id: "evt_enqueued",
    created: 0,
    data: {
      sessionID,
      inboxID,
      item: { type: "user", payload: { text: "hello" }, delivery },
    },
  }) as V2Event;

const inboxCancelled = (sessionID: string, inboxID: string): V2Event =>
  ({
    type: "session.inbox.cancelled",
    id: "evt_cancelled",
    created: 0,
    data: { sessionID, inboxID },
  }) as V2Event;

const deliveryChanged = (
  sessionID: string,
  inboxID: string,
  delivery: "steer" | "queue",
): V2Event =>
  ({
    type: "session.inbox.delivery.changed",
    id: "evt_delivery_changed",
    created: 0,
    data: { sessionID, inboxID, delivery },
  }) as V2Event;

const skillActivated = (sessionID: string): V2Event =>
  ({
    type: "session.skill.activated",
    id: "evt_skill",
    created: 0,
    data: { sessionID, id: "skill_x", name: "My Skill", text: "activated" },
  }) as V2Event;

const resetStore = () => {
  messageIndex.clear();
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
    s._client = null;
  });
};

describe("reducer permission.asked", () => {
  test("adds a permission blocker by default", () => {
    resetStore();
    handleEvent(permissionAsked());
    const blockers = eventStore.getState().session.blocker["ses_1"] ?? [];
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatchObject({
      kind: "permission",
      request: { id: "per_1" },
    });
  });

  test("still adds the blocker when auto-approve is enabled", () => {
    resetStore();
    eventStore.setState((s) => {
      s.session.autoApprove["ses_1"] = true;
    });
    handleEvent(permissionAsked());
    expect(eventStore.getState().session.blocker["ses_1"]).toHaveLength(1);
  });

  test("does not leak blockers across sessions", () => {
    resetStore();
    handleEvent(permissionAsked());
    expect(
      eventStore.getState().session.blocker["ses_other"] ?? [],
    ).toHaveLength(0);
  });
});

describe("reducer session.inbox.cancelled", () => {
  test("removes the pending entry, input, and enqueued message", () => {
    resetStore();
    handleEvent(inboxEnqueued("ses_1", "inp_1", "queue"));
    let state = eventStore.getState();
    expect(state.session.pending["ses_1"]).toHaveLength(1);
    expect(state.session.input["ses_1"]).toEqual(["inp_1"]);
    expect(state.session.message["ses_1"].map((m) => m.id)).toEqual(["inp_1"]);

    handleEvent(inboxCancelled("ses_1", "inp_1"));
    state = eventStore.getState();
    expect(state.session.pending["ses_1"]).toEqual([]);
    expect(state.session.input["ses_1"]).toEqual([]);
    expect(state.session.message["ses_1"]).toEqual([]);
  });

  test("is a no-op when the inbox item was never enqueued", () => {
    resetStore();
    handleEvent(inboxCancelled("ses_1", "inp_missing"));
    expect(eventStore.getState().session.message["ses_1"]).toBeUndefined();
  });
});

describe("reducer session.inbox.delivery.changed", () => {
  test("steer updates the pending delivery", () => {
    resetStore();
    handleEvent(inboxEnqueued("ses_1", "inp_1", "queue"));
    handleEvent(deliveryChanged("ses_1", "inp_1", "steer"));
    expect(eventStore.getState().session.pending["ses_1"][0]).toMatchObject({
      id: "inp_1",
      delivery: "steer",
    });
  });

  test("queue updates the pending delivery", () => {
    resetStore();
    handleEvent(inboxEnqueued("ses_1", "inp_1", "steer"));
    handleEvent(deliveryChanged("ses_1", "inp_1", "queue"));
    expect(eventStore.getState().session.pending["ses_1"][0]).toMatchObject({
      id: "inp_1",
      delivery: "queue",
    });
  });

  test("does not rewrite an unchanged delivery", () => {
    resetStore();
    handleEvent(inboxEnqueued("ses_1", "inp_1", "queue"));
    const before = eventStore.getState().session.pending["ses_1"][0];
    handleEvent(deliveryChanged("ses_1", "inp_1", "queue"));
    expect(eventStore.getState().session.pending["ses_1"][0]).toBe(before);
  });
});

describe("reducer session.skill.activated", () => {
  test("appends a skill message", () => {
    resetStore();
    handleEvent(skillActivated("ses_1"));
    const messages = eventStore.getState().session.message["ses_1"];
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id: "msg_skill",
      type: "skill",
      skill: "skill_x",
      name: "My Skill",
      text: "activated",
    });
  });
});

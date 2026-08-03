import { describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode-ai/client/promise";
import { eventStore } from "@/stores/store";
import { handleEvent } from "@/stores/reducer";

const permissionAsked = (overrides: Partial<V2Event> = {}): V2Event =>
  ({
    type: "permission.asked",
    id: "evt_1",
    created: 0,
    data: { id: "per_1", sessionID: "ses_1", action: "read", resources: [] },
    ...overrides,
  }) as V2Event;

const reset = () =>
  eventStore.setState((s) => {
    s.session.blocker = {};
    s.session.autoApprove = {};
  });

describe("reducer permission.asked", () => {
  test("adds a permission blocker by default", () => {
    reset();
    handleEvent(permissionAsked());
    const blockers = eventStore.getState().session.blocker["ses_1"] ?? [];
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatchObject({ kind: "permission", request: { id: "per_1" } });
  });

  test("still adds the blocker when auto-approve is enabled", () => {
    reset();
    eventStore.setState((s) => {
      s.session.autoApprove["ses_1"] = true;
    });
    handleEvent(permissionAsked());
    expect(eventStore.getState().session.blocker["ses_1"]).toHaveLength(1);
  });

  test("does not leak blockers across sessions", () => {
    reset();
    handleEvent(permissionAsked());
    expect(eventStore.getState().session.blocker["ses_other"] ?? []).toHaveLength(0);
  });
});

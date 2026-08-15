import { describe, expect, test } from "bun:test";
import { CONNECTION_CUE_KEY, connectionCue } from "@/utils/connection-cue";
import type { ConnectionStatusEvent } from "@/services/event-manager";

const actions = {
  retry: () => {},
  disconnect: () => {},
};

const base: ConnectionStatusEvent = {
  type: "connection",
  status: "connecting",
  attempt: 1,
};

function cue(
  overrides: Partial<ConnectionStatusEvent> = {},
  wasConnected = true,
) {
  return connectionCue({ ...base, ...overrides }, wasConnected, actions);
}

describe("connectionCue", () => {
  test("is silent before the first successful connection", () => {
    expect(cue({ status: "connecting" }, false)).toBeUndefined();
    expect(cue({ status: "reconnecting" }, false)).toBeUndefined();
    expect(cue({ status: "disconnected", error: "down" }, false)).toBeUndefined();
    expect(cue({ status: "connected" }, false)).toBeUndefined();
  });

  test("raises a sticky warning while reconnecting", () => {
    expect(cue({ status: "reconnecting", attempt: 3 })).toEqual({
      key: CONNECTION_CUE_KEY,
      kind: "warning",
      title: "Reconnecting…",
      description: "Attempt 3",
      sticky: true,
    });
  });

  test("raises a sticky error with actions when the connection gives up", () => {
    expect(cue({ status: "disconnected", error: "event stream disconnected" }))
      .toMatchObject({
        key: CONNECTION_CUE_KEY,
        kind: "error",
        title: "Connection lost",
        description: "event stream disconnected",
        sticky: true,
        actions: [
          { label: "Retry", onPress: actions.retry },
          { label: "Change server", onPress: actions.disconnect },
        ],
      });
  });

  test("raises a transient success cue on reconnect", () => {
    expect(cue({ status: "connected" })).toEqual({
      key: CONNECTION_CUE_KEY,
      kind: "success",
      title: "Reconnected",
      ttl: 3_000,
    });
  });

  test("is silent while connecting", () => {
    expect(cue({ status: "connecting" })).toBeUndefined();
  });
});

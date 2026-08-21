import { describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode-ai/client/promise";
import { coalesceEvents } from "@/services/event-coalesce";

const textDelta = (
  id: string,
  sessionID: string,
  assistantMessageID: string,
  ordinal: number,
  delta: string,
): V2Event =>
  ({ id, type: "session.text.delta", data: { sessionID, assistantMessageID, ordinal, delta } }) as V2Event;

const reasoningDelta = (
  id: string,
  sessionID: string,
  assistantMessageID: string,
  ordinal: number,
  delta: string,
): V2Event =>
  ({ id, type: "session.reasoning.delta", data: { sessionID, assistantMessageID, ordinal, delta } }) as V2Event;

const textEnded = (
  id: string,
  sessionID: string,
  assistantMessageID: string,
  ordinal: number,
  text: string,
): V2Event =>
  ({ id, type: "session.text.ended", data: { sessionID, assistantMessageID, ordinal, text } }) as V2Event;

const deltaOf = (event: V2Event) => (event as { data: { delta: string } }).data.delta;

describe("coalesceEvents", () => {
  test("merges adjacent same-key text deltas", () => {
    const result = coalesceEvents([
      textDelta("evt_1", "ses_1", "msg_1", 0, "a"),
      textDelta("evt_2", "ses_1", "msg_1", 0, "b"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: "session.text.delta" });
    expect(deltaOf(result[0])).toBe("ab");
  });

  test("merges same-key deltas across an interleaved delta of another type", () => {
    const result = coalesceEvents([
      textDelta("evt_1", "ses_1", "msg_1", 0, "a"),
      reasoningDelta("evt_2", "ses_1", "msg_1", 0, "r"),
      textDelta("evt_3", "ses_1", "msg_1", 0, "b"),
    ]);
    expect(result).toHaveLength(2);
    expect(deltaOf(result[0])).toBe("ab");
    expect(result[1]).toMatchObject({ type: "session.reasoning.delta" });
  });

  test("keeps different part keys separate even when adjacent", () => {
    const result = coalesceEvents([
      textDelta("evt_1", "ses_1", "msg_1", 0, "a"),
      textDelta("evt_2", "ses_1", "msg_1", 1, "b"),
    ]);
    expect(result).toHaveLength(2);
    expect(deltaOf(result[0])).toBe("a");
    expect(deltaOf(result[1])).toBe("b");
  });

  test("stops merging at a non-delta barrier", () => {
    const result = coalesceEvents([
      textDelta("evt_1", "ses_1", "msg_1", 0, "a"),
      textEnded("evt_2", "ses_1", "msg_1", 0, "ab"),
      textDelta("evt_3", "ses_1", "msg_1", 0, "c"),
    ]);
    expect(result).toHaveLength(3);
    expect(deltaOf(result[0])).toBe("a");
    expect(result[1]).toMatchObject({ type: "session.text.ended" });
    expect(deltaOf(result[2])).toBe("c");
  });
});

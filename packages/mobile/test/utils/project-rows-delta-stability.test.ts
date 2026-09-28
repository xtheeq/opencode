import { expect, test } from "bun:test";
import type {
  SessionMessageAssistant,
  SessionMessageAssistantTool,
  SessionMessageUser,
} from "@opencode/client/promise";
import { projectionStats, projectRows } from "@/hooks/project-rows";

// Simulates the store's immer behavior for a streaming delta: the text part and
// the assistant message are new objects, while the reasoning/tool part objects
// and the surrounding messages keep their identity.
const reasoning = { type: "reasoning", text: "why" } as const;
const read: SessionMessageAssistantTool = {
  type: "tool",
  id: "t1",
  name: "read",
  state: { status: "streaming", input: "" },
  time: { created: 0 },
};

const assistantWithText = (text: string): SessionMessageAssistant => ({
  id: "a1",
  type: "assistant",
  agent: "build",
  model: { id: "gpt", providerID: "openai" },
  content: [reasoning, read, { type: "text", text }],
  time: { created: 0 },
});

const before = (): SessionMessageUser => ({
  id: "u1",
  type: "user",
  text: "go",
  time: { created: 0 },
});

// These encode the target behavior and currently fail. Once the behavior is
// implemented, Bun reports the passing `test.failing` as a failure — convert
// them to plain `test` then.
test.failing("keeps the rows array identity across a text delta", () => {
  const message = before();
  const first = projectRows([message, assistantWithText("one")]);
  const second = projectRows([message, assistantWithText("two")]);
  expect(second).toBe(first);
});

test.failing("keeps the streaming message's non-text rows stable across a text delta", () => {
  const first = projectRows([assistantWithText("one")]);
  const second = projectRows([assistantWithText("two")]);

  const firstReasoning = first.find((row) => row.type === "reasoning-group");
  const secondReasoning = second.find((row) => row.type === "reasoning-group");
  expect(secondReasoning).toBe(firstReasoning);

  const firstExploration = first.find((row) => row.type === "exploration-group");
  const secondExploration = second.find((row) => row.type === "exploration-group");
  expect(secondExploration).toBe(firstExploration);
});

test("reprojects every row of the streaming message on a text delta", () => {
  const first = projectRows([assistantWithText("one")]);
  const second = projectRows([assistantWithText("two")]);
  expect(second[0]).not.toBe(first[0]);
});

test("keeps non-streaming rows stable across a text delta", () => {
  const message = before();
  const first = projectRows([message, assistantWithText("one")]);
  const second = projectRows([message, assistantWithText("two")]);
  expect(second[0]).toBe(first[0]);
});

test("counts one projection run and one miss per text delta", () => {
  const message = before();
  projectRows([message, assistantWithText("one")]);

  const mark = { ...projectionStats };
  projectRows([message, assistantWithText("two")]);
  expect(projectionStats.runs - mark.runs).toBe(1);
  expect(projectionStats.projectedMessages - mark.projectedMessages).toBe(1);
  expect(projectionStats.cachedMessages - mark.cachedMessages).toBe(1);
});

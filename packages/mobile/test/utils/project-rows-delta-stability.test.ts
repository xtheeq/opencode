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
const bash: SessionMessageAssistantTool = {
  type: "tool",
  id: "t2",
  name: "bash",
  state: { status: "streaming", input: "" },
  time: { created: 0 },
};

const assistantWithText = (
  id: string,
  text: string,
): SessionMessageAssistant => ({
  id,
  type: "assistant",
  agent: "build",
  model: { id: "gpt", providerID: "openai" },
  content: [reasoning, read, { type: "text", text }],
  time: { created: 0 },
});

const assistantWithExtraTool = (
  id: string,
  text: string,
): SessionMessageAssistant => ({
  id,
  type: "assistant",
  agent: "build",
  model: { id: "gpt", providerID: "openai" },
  content: [reasoning, read, bash, { type: "text", text }],
  time: { created: 0 },
});

const userMessage = (): SessionMessageUser => ({
  id: "u1",
  type: "user",
  text: "go",
  time: { created: 0 },
});

test("keeps the rows array identity across a text delta", () => {
  const message = userMessage();
  const first = projectRows([message, assistantWithText("a1", "one")]);
  const second = projectRows([message, assistantWithText("a1", "two")]);
  expect(second).toBe(first);
});

test("keeps the streaming message's non-text rows stable across a text delta", () => {
  const first = projectRows([assistantWithText("a2", "one")]);
  const second = projectRows([assistantWithText("a2", "two")]);

  const firstReasoning = first.find((row) => row.type === "reasoning-group");
  const secondReasoning = second.find((row) => row.type === "reasoning-group");
  expect(secondReasoning).toBe(firstReasoning);

  const firstExploration = first.find((row) => row.type === "exploration-group");
  const secondExploration = second.find((row) => row.type === "exploration-group");
  expect(secondExploration).toBe(firstExploration);
});

test("keeps non-streaming rows stable across a text delta", () => {
  const message = userMessage();
  const first = projectRows([message, assistantWithText("a3", "one")]);
  const second = projectRows([message, assistantWithText("a3", "two")]);
  expect(second[0]).toBe(first[0]);
});

test("reprojects when the part structure changes", () => {
  const first = projectRows([assistantWithText("a4", "one")]);
  const second = projectRows([assistantWithExtraTool("a4", "one")]);
  expect(second).not.toBe(first);
  expect(second.map((row) => row.type)).not.toEqual(
    first.map((row) => row.type),
  );
});

test("counts one run and structure reuse per text delta", () => {
  const message = userMessage();
  projectRows([message, assistantWithText("a5", "one")]);

  const mark = { ...projectionStats };
  projectRows([message, assistantWithText("a5", "two")]);
  expect(projectionStats.runs - mark.runs).toBe(1);
  expect(projectionStats.projectedMessages - mark.projectedMessages).toBe(0);
  expect(projectionStats.cachedMessages - mark.cachedMessages).toBe(1);
  expect(projectionStats.reusedMessages - mark.reusedMessages).toBe(1);
});

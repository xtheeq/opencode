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

test("keeps the streaming message's activity rows stable across a text delta", () => {
  const first = projectRows([assistantWithText("a2", "one")]);
  const second = projectRows([assistantWithText("a2", "two")]);

  const firstActivity = first.find((row) => row.type === "activity-group");
  const secondActivity = second.find((row) => row.type === "activity-group");
  expect(secondActivity).toBe(firstActivity);
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

  const firstActivity = first.find((row) => row.type === "activity-group");
  const secondActivity = second.find((row) => row.type === "activity-group");
  if (
    firstActivity?.type !== "activity-group" ||
    secondActivity?.type !== "activity-group"
  )
    throw new Error("expected activity groups");
  expect(secondActivity.parts.length).toBe(firstActivity.parts.length + 1);
});

test("counts one run and a cached signature per text delta", () => {
  const message = userMessage();
  projectRows([message, assistantWithText("a5", "one")]);

  const mark = { ...projectionStats };
  projectRows([message, assistantWithText("a5", "two")]);
  expect(projectionStats.runs - mark.runs).toBe(1);
  expect(projectionStats.projections - mark.projections).toBe(0);
  expect(projectionStats.cached - mark.cached).toBe(1);
});

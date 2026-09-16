import { describe, expect, test } from "bun:test";
import type {
  SessionMessageAssistant,
  SessionMessageUser,
} from "@opencode/client/promise";
import {
  clearCommittedRows,
  projectCommittedRows,
  projectRows,
} from "@/hooks/project-rows";
import { rowKey } from "@/types/rows";

const user = (id: string, text: string): SessionMessageUser => ({
  id,
  type: "user",
  text,
  time: { created: 0 },
});

const assistant = (id: string, text: string): SessionMessageAssistant => ({
  id,
  type: "assistant",
  agent: "build",
  model: { id: "gpt", providerID: "openai" },
  content: [{ type: "text", text }],
  time: { created: 0 },
});

describe("projectRows identity", () => {
  test("reuses rows for unchanged messages across a streaming delta", () => {
    const message = user("u1", "hello");
    const first = projectRows([message, assistant("a1", "hi")]);
    const second = projectRows([message, assistant("a1", "hi there")]);

    const firstUser = first.find((row) => row.type === "user-message");
    const secondUser = second.find((row) => row.type === "user-message");
    expect(secondUser).toBe(firstUser);
  });

  test("reprojects only the changed message's rows", () => {
    const message = user("u1", "hello");
    const first = projectRows([message, assistant("a1", "hi")]);
    const second = projectRows([message, assistant("a1", "hi there")]);

    const firstText = first.find((row) => row.type === "assistant-part");
    const secondText = second.find((row) => row.type === "assistant-part");
    if (firstText?.type !== "assistant-part" || secondText?.type !== "assistant-part")
      throw new Error("expected assistant text rows");
    expect(secondText).not.toBe(firstText);
    expect(rowKey(secondText)).toBe(rowKey(firstText));
  });
});

describe("projectRows grouping", () => {
  test("groups adjacent reasoning parts and completes on a following non-reasoning part", () => {
    const message: SessionMessageAssistant = {
      ...assistant("a1", ""),
      content: [
        { type: "reasoning", text: "first" },
        { type: "reasoning", text: "second" },
        { type: "text", text: "answer" },
      ],
    };

    const rows = projectRows([message]);
    expect(rows.map((row) => row.type)).toEqual([
      "reasoning-group",
      "assistant-part",
    ]);

    const group = rows[0];
    if (group.type !== "reasoning-group")
      throw new Error("expected a reasoning group");
    expect(group.parts).toHaveLength(2);
    expect(group.completed).toBe(true);
  });
});

describe("projectCommittedRows", () => {
  test("holds the committed rows stable across a streaming delta", () => {
    clearCommittedRows("s1");
    const message = user("u1", "hello");
    const first = assistant("a1", "hi");
    const before = projectCommittedRows("s1", [message, first], first);
    expect(before.streamed).toBe(true);
    expect(before.committed.map(rowKey)).toEqual(["user:u1"]);

    const next: SessionMessageAssistant = {
      ...first,
      content: [{ type: "text", text: "hi there" }],
    };
    const after = projectCommittedRows("s1", [message, next], next);
    expect(after.streamed).toBe(true);
    expect(after.committed).toBe(before.committed);
  });

  test("keeps the active message in data when it is not the last row", () => {
    clearCommittedRows("s2");
    const active = assistant("a1", "streaming");
    const queued = user("u2", "queued");
    const result = projectCommittedRows("s2", [active, queued], active);

    expect(result.streamed).toBe(false);
    expect(result.committed.map(rowKey)).toEqual([
      "part:a1:text:0",
      "user:u2",
    ]);
  });

  test("does not isolate anything when the session is idle", () => {
    clearCommittedRows("s3");
    const rows = projectCommittedRows(
      "s3",
      [user("u1", "hello"), assistant("a1", "done")],
      undefined,
    );
    expect(rows.streamed).toBe(false);
    expect(rows.committed.map(rowKey)).toEqual(["user:u1", "part:a1:text:0"]);
  });
});

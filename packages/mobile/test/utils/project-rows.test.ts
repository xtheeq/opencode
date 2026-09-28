import { describe, expect, test } from "bun:test";
import type {
  SessionInboxUser,
  SessionMessageAssistant,
  SessionMessageAssistantTool,
  SessionMessageCompaction,
  SessionMessageIdle,
  SessionMessageShell,
  SessionMessageSynthetic,
  SessionMessageSystem,
  SessionMessageUser,
} from "@opencode/client/promise";
import {
  projectionStats,
  projectRows,
  resetProjectionStats,
  visibleTimelineMessages,
} from "@/hooks/project-rows";
import { rowKey } from "@/types/rows";

const user = (id: string, text: string): SessionMessageUser => ({
  id,
  type: "user",
  text,
  time: { created: 0 },
});

const assistant = (
  id: string,
  text: string,
  overrides: Partial<SessionMessageAssistant> = {},
): SessionMessageAssistant => ({
  id,
  type: "assistant",
  agent: "build",
  model: { id: "gpt", providerID: "openai" },
  content: [{ type: "text", text }],
  time: { created: 0 },
  ...overrides,
});

const tool = (
  id: string,
  name: string,
  state: SessionMessageAssistantTool["state"] = { status: "streaming", input: "" },
): SessionMessageAssistantTool => ({
  type: "tool",
  id,
  name,
  state,
  time: { created: 0 },
});

const shell: SessionMessageShell = {
  id: "sh1",
  type: "shell",
  shellID: "s1",
  command: "ls",
  status: "exited",
  exit: 0,
  time: { created: 0 },
};

const system: SessionMessageSystem = {
  id: "sys1",
  type: "system",
  text: "system",
  time: { created: 0 },
};

const synthetic = (id: string, description?: string): SessionMessageSynthetic => ({
  id,
  type: "synthetic",
  text: "note",
  description,
  time: { created: 0 },
});

const idle: SessionMessageIdle = {
  id: "id1",
  type: "idle",
  outcome: "succeeded",
  time: { created: 0 },
};

const compaction = (status: SessionMessageCompaction["status"]): SessionMessageCompaction =>
  status === "running"
    ? {
        id: "c1",
        type: "compaction",
        status,
        reason: "auto",
        summary: "",
        recent: "",
        time: { created: 0 },
      }
    : status === "completed"
      ? {
          id: "c1",
          type: "compaction",
          status,
          reason: "auto",
          summary: "",
          recent: "",
          time: { created: 0 },
        }
      : {
          id: "c1",
          type: "compaction",
          status,
          reason: "auto",
          error: { type: "compaction.failed", message: "failed" },
          time: { created: 0 },
        };

describe("projectRows identity", () => {
  test("reuses rows for unchanged messages across a streaming delta", () => {
    const message = user("u1", "hello");
    const first = projectRows([message, assistant("a1", "hi")]);
    const second = projectRows([message, assistant("a1", "hi there")]);

    const firstUser = first.find((row) => row.type === "user-message");
    const secondUser = second.find((row) => row.type === "user-message");
    expect(secondUser).toBe(firstUser);
  });

  test("reuses the streaming message's rows when only text changes", () => {
    const first = projectRows([assistant("a2", "hi")]);
    const second = projectRows([assistant("a2", "hi there")]);

    expect(second).toBe(first);
  });

  test("reprojects when the content structure changes", () => {
    const first = projectRows([assistant("a3", "hi")]);
    const second = projectRows([assistant("a3", "hi", { finish: "stop" })]);

    expect(second).not.toBe(first);
    expect(second.some((row) => row.type === "assistant-footer")).toBe(true);
  });
});

describe("projectRows grouping", () => {
  test("groups adjacent reasoning parts and completes on a following text part", () => {
    const message: SessionMessageAssistant = {
      ...assistant("grp-a1", ""),
      content: [
        { type: "reasoning", text: "first" },
        { type: "reasoning", text: "second" },
        { type: "text", text: "answer" },
      ],
    };

    const rows = projectRows([message]);
    expect(rows.map((row) => row.type)).toEqual([
      "activity-group",
      "assistant-part",
    ]);

    const group = rows[0];
    if (group.type !== "activity-group")
      throw new Error("expected an activity group");
    expect(group.parts).toHaveLength(2);
    expect(group.completed).toBe(true);
  });

  test("groups adjacent tools and breaks the group on text", () => {
    const message: SessionMessageAssistant = {
      ...assistant("grp-a2", ""),
      content: [
        tool("t1", "read"),
        tool("t2", "grep"),
        { type: "text", text: "answer" },
        tool("t3", "glob"),
      ],
    };

    const rows = projectRows([message]);
    expect(rows.map((row) => row.type)).toEqual([
      "activity-group",
      "assistant-part",
      "activity-group",
    ]);

    const first = rows[0];
    if (first.type !== "activity-group")
      throw new Error("expected an activity group");
    expect(first.parts.map((ref) => ref.partID)).toEqual(["t1", "t2"]);
  });

  test("leaves a question tool standalone", () => {
    const message: SessionMessageAssistant = {
      ...assistant("grp-a3", ""),
      content: [tool("q1", "question"), tool("t1", "bash")],
    };
    expect(projectRows([message]).map((row) => row.type)).toEqual([
      "assistant-part",
      "activity-group",
    ]);
  });

  test("leaves an errored tool standalone", () => {
    const message: SessionMessageAssistant = {
      ...assistant("grp-a4", ""),
      content: [
        tool("e1", "bash", {
          status: "error",
          input: {},
          error: { type: "tool", message: "boom" },
        }),
        tool("t1", "read"),
      ],
    };
    expect(projectRows([message]).map((row) => row.type)).toEqual([
      "assistant-part",
      "activity-group",
    ]);
  });

  test("emits a footer only for a terminal step", () => {
    expect(
      projectRows([assistant("fin-a1", "done", { finish: "stop" })]).map(
        (row) => row.type,
      ),
    ).toEqual(["assistant-part", "assistant-footer"]);
    expect(
      projectRows([assistant("fin-a2", "calling", { finish: "tool-calls" })]).map(
        (row) => row.type,
      ),
    ).toEqual(["assistant-part"]);
    expect(
      projectRows([assistant("fin-a3", "", { finish: "unknown" })]).map(
        (row) => row.type,
      ),
    ).toEqual([]);
  });

  test("emits a footer for an errored step", () => {
    const rows = projectRows([
      assistant("err-a1", "partial", {
        error: { type: "api", message: "boom" },
      }),
    ]);
    expect(rows.map((row) => row.type)).toEqual([
      "assistant-part",
      "assistant-footer",
    ]);
  });
});

describe("projectRows message mapping", () => {
  test("drops idle and empty synthetic messages", () => {
    expect(projectRows([idle, synthetic("syn1")])).toEqual([]);
  });

  test("maps shell, system, non-empty synthetic, and compaction messages", () => {
    const rows = projectRows([
      shell,
      system,
      synthetic("syn2", "note"),
      compaction("running"),
    ]);
    expect(rows.map((row) => row.type)).toEqual([
      "shell-message",
      "system-message",
      "system-message",
      "compaction-message",
    ]);
  });

  test("reorders pending compactions and input messages to the end", () => {
    const rows = projectRows(
      [compaction("running"), user("u1", "hello"), assistant("ord-a1", "hi")],
      { inputs: new Set(["u1"]) },
    );
    expect(rows.map((row) => row.type)).toEqual([
      "assistant-part",
      "compaction-message",
      "user-message",
    ]);
    const last = rows.at(-1);
    if (last?.type !== "user-message")
      throw new Error("expected the input user message last");
    expect(last.messageID).toBe("u1");
  });
});

describe("projectRows row keys", () => {
  test("keeps every projected row key unique", () => {
    const message: SessionMessageAssistant = {
      ...assistant("key-a1", ""),
      content: [
        { type: "reasoning", text: "thinking" },
        tool("t1", "read"),
        tool("t2", "grep"),
        { type: "text", text: "answer" },
      ],
    };
    const rows = projectRows([user("key-u1", "go"), message, shell, system]);
    const keys = rows.map(rowKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("projectRows turn usage", () => {
  test("folds a turn's steps into one turn-usage row", () => {
    const tokens = { input: 1, output: 2, reasoning: 0, cache: { read: 0, write: 0 } };
    const first = assistant("usage-a1", "", { finish: "tool-calls", tokens });
    const second = assistant("usage-a2", "done", { finish: "stop", tokens });

    const rows = projectRows([user("usage-u1", "go"), first, second], {
      turnTokens: true,
    });
    const usage = rows.find((row) => row.type === "turn-usage");
    if (usage?.type !== "turn-usage") throw new Error("expected a turn-usage row");
    expect(usage.messageIDs).toEqual(["usage-a1", "usage-a2"]);
  });
});

describe("visibleTimelineMessages", () => {
  const inboxUser = (
    id: string,
    delivery: "steer" | "queue",
  ): SessionInboxUser => ({
    id,
    sessionID: "ses_1",
    type: "user",
    delivery,
    payload: { text: id },
    time: { created: 0 },
  });

  test("returns the same array when nothing is pending or reverted", () => {
    const messages = [user("msg_1", "one"), assistant("msg_2", "hi")];
    expect(visibleTimelineMessages(messages, [])).toBe(messages);
  });

  test("hides queued prompts", () => {
    const messages = [
      user("msg_1", "one"),
      user("msg_2", "two"),
      assistant("msg_3", "hi"),
    ];
    const visible = visibleTimelineMessages(messages, [
      inboxUser("msg_2", "queue"),
    ]);
    expect(visible.map((message) => message.id)).toEqual(["msg_1", "msg_3"]);
  });

  test("pins pending steers to the end", () => {
    const messages = [
      user("msg_1", "one"),
      user("msg_2", "two"),
      assistant("msg_3", "hi"),
    ];
    const visible = visibleTimelineMessages(messages, [
      inboxUser("msg_1", "steer"),
    ]);
    expect(visible.map((message) => message.id)).toEqual([
      "msg_2",
      "msg_3",
      "msg_1",
    ]);
  });

  test("hides messages at or after a staged revert boundary", () => {
    const messages = [
      user("msg_1", "one"),
      user("msg_2", "two"),
      assistant("msg_3", "hi"),
    ];
    const visible = visibleTimelineMessages(messages, [], "msg_3");
    expect(visible.map((message) => message.id)).toEqual(["msg_1", "msg_2"]);
  });
});

describe("projectionStats", () => {
  test("counts runs, projections, and cached signatures", () => {
    resetProjectionStats();

    const beforeFirst = { ...projectionStats };
    projectRows([user("stats-u1", "hi"), assistant("stats-a1", "one")]);
    expect(projectionStats.runs - beforeFirst.runs).toBe(1);
    expect(projectionStats.projections - beforeFirst.projections).toBe(1);
    expect(projectionStats.cached - beforeFirst.cached).toBe(0);

    const beforeSecond = { ...projectionStats };
    projectRows([user("stats-u1", "hi"), assistant("stats-a1", "two")]);
    expect(projectionStats.runs - beforeSecond.runs).toBe(1);
    expect(projectionStats.projections - beforeSecond.projections).toBe(0);
    expect(projectionStats.cached - beforeSecond.cached).toBe(1);
  });
});

import { describe, expect, test } from "bun:test";
import type {
  SessionMessageAssistant,
  SessionMessageIdle,
  SessionMessageShell,
  SessionMessageSystem,
  SessionMessageUser,
} from "@opencode/client/promise";
import {
  findTerminalAssistant,
  foldTurns,
  isTerminalAssistant,
} from "@/session/rows/turn";

const user = (id: string): SessionMessageUser => ({
  id,
  type: "user",
  text: "go",
  time: { created: 0 },
});

const assistant = (
  id: string,
  overrides: Partial<SessionMessageAssistant> = {},
): SessionMessageAssistant => ({
  id,
  type: "assistant",
  agent: "build",
  model: { id: "gpt", providerID: "openai" },
  content: [],
  time: { created: 0 },
  ...overrides,
});

const notice = (id: string): SessionMessageSystem => ({
  id,
  type: "system",
  text: "notice",
  time: { created: 0 },
});

const idle = (id: string): SessionMessageIdle => ({
  id,
  type: "idle",
  outcome: "succeeded",
  time: { created: 0 },
});

const shell = (id: string): SessionMessageShell => ({
  id,
  type: "shell",
  shellID: "s1",
  command: "ls",
  status: "exited",
  time: { created: 0 },
});

describe("foldTurns", () => {
  test("starts a turn at a user and attaches assistants and notices until idle", () => {
    const { turns, leading } = foldTurns([
      user("u1"),
      notice("n1"),
      assistant("a1"),
      assistant("a2"),
      idle("i1"),
      assistant("a3"),
    ]);

    expect(leading).toEqual([]);
    expect(turns.map((turn) => turn.userMessageID ?? turn.id)).toEqual([
      "u1",
      "a3",
    ]);
    expect(turns[0].messages.map((message) => message.id)).toEqual([
      "n1",
      "a1",
      "a2",
    ]);
    expect(turns[1].messages.map((message) => message.id)).toEqual(["a3"]);
  });

  test("collects notices before any turn as leading", () => {
    const { turns, leading } = foldTurns([notice("n1"), user("u1")]);
    expect(leading.map((message) => message.id)).toEqual(["n1"]);
    expect(turns).toHaveLength(1);
  });

  test("treats a shell as a standalone turn; a following assistant starts its own", () => {
    const { turns } = foldTurns([shell("sh1"), assistant("a1")]);
    expect(turns.map((turn) => turn.shellMessageID ?? turn.id)).toEqual([
      "sh1",
      "a1",
    ]);
    expect(turns[0].messages).toEqual([]);
    expect(turns[1].messages.map((message) => message.id)).toEqual(["a1"]);
  });

  test("attaches notices after a shell to the shell turn", () => {
    const { turns } = foldTurns([shell("sh1"), notice("n1")]);
    expect(turns).toHaveLength(1);
    expect(turns[0].messages.map((message) => message.id)).toEqual(["n1"]);
  });
});

describe("isTerminalAssistant", () => {
  test("detects terminal finishes and errors", () => {
    expect(isTerminalAssistant(assistant("a1", { finish: "stop" }))).toBe(true);
    expect(isTerminalAssistant(assistant("a1", { finish: "tool-calls" }))).toBe(
      false,
    );
    expect(
      isTerminalAssistant(
        assistant("a1", { error: { type: "x", message: "boom" } }),
      ),
    ).toBe(true);
  });
});

describe("findTerminalAssistant", () => {
  test("finds the last terminal or retrying assistant", () => {
    const turn = {
      id: "u1",
      userMessageID: "u1",
      messages: [
        assistant("a1", { finish: "tool-calls" }),
        assistant("a2", { finish: "stop" }),
      ],
    };
    expect(findTerminalAssistant(turn)?.id).toBe("a2");
  });

  test("returns a retrying assistant", () => {
    const turn = {
      id: "u1",
      userMessageID: "u1",
      messages: [
        assistant("a1", {
          retry: { attempt: 1, at: 0, error: { type: "x", message: "boom" } },
        }),
      ],
    };
    expect(findTerminalAssistant(turn)?.id).toBe("a1");
  });

  test("returns undefined while a turn is still streaming", () => {
    const turn = {
      id: "u1",
      userMessageID: "u1",
      messages: [assistant("a1", { finish: "tool-calls" })],
    };
    expect(findTerminalAssistant(turn)).toBeUndefined();
  });
});

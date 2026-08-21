import { describe, expect, test } from "bun:test";
import type { SessionMessageAssistantTool } from "@opencode-ai/client/promise";
import {
  stripAnsi,
  toolArgs,
  toolError,
  toolInput,
  toolLabel,
  toolMetadata,
  toolOutput,
} from "@/utils/tool-state";

const tool = (overrides: Partial<SessionMessageAssistantTool> = {}): SessionMessageAssistantTool =>
  ({
    type: "tool",
    id: "tool_1",
    name: "bash",
    state: { status: "completed", input: {}, content: [{ type: "text", text: "" }] },
    time: { created: 0 },
    ...overrides,
  }) as SessionMessageAssistantTool;

describe("toolInput", () => {
  test("parses streaming JSON string input", () => {
    const part = tool({
      name: "write",
      state: { status: "streaming", input: '{"path":"a.ts","content":"hi"}' },
    });
    expect(toolInput(part)).toEqual({ path: "a.ts", content: "hi" });
  });

  test("returns empty for unparseable streaming input", () => {
    const part = tool({
      name: "edit",
      state: { status: "streaming", input: '{"path":"a.ts","oldStr' },
    });
    expect(toolInput(part)).toEqual({});
  });

  test("returns the resolved input object outside streaming", () => {
    const part = tool({
      name: "bash",
      state: { status: "completed", input: { command: "ls -la" }, content: [{ type: "text", text: "" }] },
    });
    expect(toolInput(part)).toEqual({ command: "ls -la" });
  });
});

describe("toolMetadata", () => {
  test("returns metadata from running state", () => {
    const part = tool({ state: { status: "running", input: {}, metadata: { count: 3 } } });
    expect(toolMetadata(part)).toEqual({ count: 3 });
  });

  test("falls back to empty when the state has no metadata field", () => {
    const part = tool({ state: { status: "streaming", input: "{}" } });
    expect(toolMetadata(part)).toEqual({});
  });
});

describe("toolOutput", () => {
  test("reads live output from metadata while running", () => {
    const part = tool({
      state: { status: "running", input: {}, metadata: { output: "hello\nworld" } },
    });
    expect(toolOutput(part)).toBe("hello\nworld");
  });

  test("joins text content on completion", () => {
    const part = tool({
      state: {
        status: "completed",
        input: {},
        content: [
          { type: "text", text: "a" },
          { type: "text", text: "b" },
        ],
      },
    });
    expect(toolOutput(part)).toBe("a\nb");
  });

  test("returns undefined when there is no output", () => {
    const part = tool({ state: { status: "streaming", input: "{}" } });
    expect(toolOutput(part)).toBeUndefined();
  });
});

describe("toolError", () => {
  test("returns the error message in error state", () => {
    const part = tool({
      state: { status: "error", input: {}, error: { type: "tool.failed", message: "boom" } },
    });
    expect(toolError(part)).toBe("boom");
  });

  test("returns undefined outside error state", () => {
    const part = tool({ state: { status: "completed", input: {}, content: [{ type: "text", text: "" }] } });
    expect(toolError(part)).toBeUndefined();
  });
});

describe("toolLabel", () => {
  test("picks the first present label key", () => {
    expect(toolLabel({ query: "open", path: "/p/f.ts", name: "x" })).toBe("open");
  });

  test("ignores empty strings", () => {
    expect(toolLabel({ path: "", pattern: "*.ts" })).toBe("*.ts");
  });

  test("returns undefined when no label key is present", () => {
    expect(toolLabel({ command: "ls" })).toBeUndefined();
  });
});

describe("toolArgs", () => {
  test("renders short scalar keys as key=value chips", () => {
    expect(toolArgs({ pattern: "*.ts", offset: 40, limit: 100, verbose: false })).toEqual([
      "offset=40",
      "limit=100",
      "verbose=false",
    ]);
  });

  test("skips label keys and object values", () => {
    expect(toolArgs({ path: "/p", offset: 3, nested: { a: 1 }, tags: [1] })).toEqual(["offset=3"]);
  });

  test("caps at three args and drops oversized strings", () => {
    const huge = "x".repeat(200);
    expect(toolArgs({ a: 1, b: 2, c: 3, d: 4, blob: huge })).toEqual(["a=1", "b=2", "c=3"]);
  });
});

describe("stripAnsi", () => {
  test("removes ANSI escape sequences", () => {
    expect(stripAnsi("\u001B[32mgreen\u001B[0m plain")).toBe("green plain");
  });

  test("leaves plain text untouched", () => {
    expect(stripAnsi("no escapes here")).toBe("no escapes here");
  });
});

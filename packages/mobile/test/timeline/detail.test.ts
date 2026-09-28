import { describe, expect, test } from "bun:test";
import type {
  SessionMessageAssistant,
  SessionMessageAssistantTool,
  SessionMessageCompaction,
  SessionMessageSynthetic,
} from "@opencode/client/promise";
import {
  timelineCategories,
  timelineCategory,
  timelinePreset,
  timelinePresets,
  timelineNoticeRequired,
} from "@/timeline/detail";

const tool = (name: string): SessionMessageAssistantTool => ({
  type: "tool",
  id: `tool-${name}`,
  name,
  state: { status: "streaming", input: "" },
  time: { created: 0 },
});

const assistant = (content: SessionMessageAssistant["content"]): SessionMessageAssistant => ({
  id: "assistant-1",
  type: "assistant",
  agent: "build",
  model: { id: "gpt", providerID: "openai" },
  content,
  time: { created: 0 },
});

const synthetic = (metadata?: SessionMessageSynthetic["metadata"]): SessionMessageSynthetic => ({
  id: "synthetic-1",
  type: "synthetic",
  text: "",
  metadata,
  time: { created: 0 },
});

const compaction = (status: SessionMessageCompaction["status"]): SessionMessageCompaction =>
  status === "running"
    ? { id: "compaction-1", type: "compaction", status, reason: "auto", summary: "", recent: "", time: { created: 0 } }
    : status === "completed"
      ? { id: "compaction-1", type: "compaction", status, reason: "auto", summary: "", recent: "", time: { created: 0 } }
      : {
          id: "compaction-1",
          type: "compaction",
          status,
          reason: "auto",
          error: { type: "compaction.failed", message: "failed" },
          time: { created: 0 },
        };

describe("timelinePreset", () => {
  test("reverse-matches every built-in preset", () => {
    for (const preset of timelinePresets) {
      expect(timelinePreset(preset.value)?.id).toBe(preset.id);
    }
  });

  test("returns undefined for a value that matches no preset", () => {
    const custom = {
      ...timelinePresets[2].value,
      tools: { placement: "separate" as const },
    };
    expect(timelinePreset(custom)).toBeUndefined();
  });

  test("covers every category", () => {
    for (const preset of timelinePresets) {
      expect(Object.keys(preset.value).sort()).toEqual([...timelineCategories].sort());
    }
  });
});

describe("timelineCategory", () => {
  test("maps text to undefined and reasoning to thinking", () => {
    expect(timelineCategory({ type: "text", text: "hi" })).toBeUndefined();
    expect(timelineCategory({ type: "reasoning", text: "thinking" })).toBe("thinking");
  });

  test("maps tool names to their category", () => {
    expect(timelineCategory(tool("shell"))).toBe("shell");
    expect(timelineCategory(tool("execute"))).toBe("shell");
    expect(timelineCategory(tool("bash"))).toBe("shell");
    expect(timelineCategory(tool("edit"))).toBe("edit");
    expect(timelineCategory(tool("write"))).toBe("edit");
    expect(timelineCategory(tool("patch"))).toBe("edit");
    expect(timelineCategory(tool("apply_patch"))).toBe("edit");
    expect(timelineCategory(tool("subagent"))).toBe("subagents");
    expect(timelineCategory(tool("task"))).toBe("subagents");
    expect(timelineCategory(tool("read"))).toBe("tools");
    expect(timelineCategory(tool("grep"))).toBe("tools");
  });
});

describe("timelineNoticeRequired", () => {
  test("requires every non-completed compaction", () => {
    expect(timelineNoticeRequired(compaction("running"))).toBe(true);
    expect(timelineNoticeRequired(compaction("failed"))).toBe(true);
    expect(timelineNoticeRequired(compaction("completed"))).toBe(false);
  });

  test("requires error synthetic notices", () => {
    expect(timelineNoticeRequired(synthetic({ state: "error" }))).toBe(true);
  });

  test("requires a failed completed shell notice", () => {
    expect(timelineNoticeRequired(synthetic({ source: "shell", state: "completed", exit: 1 }))).toBe(true);
    expect(timelineNoticeRequired(synthetic({ source: "shell", state: "completed", timeout: true }))).toBe(true);
    expect(timelineNoticeRequired(synthetic({ source: "shell", state: "completed", exit: 0 }))).toBe(false);
  });

  test("does not require plain synthetic or non-notice messages", () => {
    expect(timelineNoticeRequired(synthetic())).toBe(false);
    expect(timelineNoticeRequired(assistant([{ type: "text", text: "hi" }]))).toBe(false);
  });
});

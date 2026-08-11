import { describe, expect, test } from "bun:test";
import type { ModelRef, SessionPromptInput } from "@opencode-ai/client/promise";
import { buildPromptRequest, submitComposer, type ComposerApi } from "@/utils/composer-submit";
import type { ComposerPart, ComposerState } from "@/types/composer";

function state(overrides: Partial<ComposerState> = {}): ComposerState {
  return {
    prompt: [{ type: "text", content: "hello", start: 0, end: 5 }],
    cursor: 5,
    ...overrides,
  };
}

function recordingApi() {
  const calls: string[] = [];
  const prompts: SessionPromptInput[] = [];
  const api: ComposerApi = {
    createSession: async () => {
      calls.push("create");
      return { id: "ses_new" };
    },
    switchAgent: async () => {
      calls.push("agent");
    },
    switchModel: async () => {
      calls.push("model");
    },
    prompt: async (input) => {
      calls.push("prompt");
      prompts.push(input);
    },
  };
  return { api, calls, prompts };
}

describe("buildPromptRequest", () => {
  test("joins all part contents into the request text", () => {
    const prompt: ComposerPart[] = [
      { type: "text", content: "A ", start: 0, end: 2 },
      { type: "file", path: "/p/one.ts", content: "@/p/one.ts", start: 2, end: 13, filename: "one.ts" },
      { type: "text", content: " B", start: 13, end: 15 },
    ];

    const request = buildPromptRequest(prompt);

    expect(request.text).toBe("A @/p/one.ts B");
    expect(request.files).toEqual([
      { uri: "file:///p/one.ts", name: "one.ts", mention: { start: 2, end: 13, text: "@/p/one.ts" } },
    ]);
    expect(request.agents).toEqual([]);
  });

  test("uses the resource url for file mentions that carry one", () => {
    const prompt: ComposerPart[] = [
      {
        type: "file",
        path: "resource://pw/spec",
        content: "@spec",
        start: 0,
        end: 5,
        url: "resource://pw/spec",
        filename: "spec",
      },
    ];

    const request = buildPromptRequest(prompt);

    expect(request.files[0].uri).toBe("resource://pw/spec");
  });

  test("maps agent parts to agent attachments", () => {
    const prompt: ComposerPart[] = [{ type: "agent", name: "coder", content: "@coder", start: 0, end: 6 }];

    const request = buildPromptRequest(prompt);

    expect(request.agents).toEqual([{ name: "coder", mention: { start: 0, end: 6, text: "@coder" } }]);
  });
});

describe("submitComposer", () => {
  test("prompts directly when the session selection is unchanged", async () => {
    const { api, calls } = recordingApi();

    const result = await submitComposer({
      state: state(),
      session: {
        id: "ses_1",
        agent: "planner",
        model: { id: "claude", providerID: "anthropic", variant: "default" },
      },
      api,
    });

    expect(calls).toEqual(["prompt"]);
    expect(result.sessionID).toBe("ses_1");
  });

  test("switches agent and model when the selection differs", async () => {
    const { api, calls } = recordingApi();

    await submitComposer({
      state: state({ agent: "coder", model: { providerID: "openai", modelID: "gpt-5", variant: null } }),
      session: {
        id: "ses_1",
        agent: "planner",
        model: { id: "claude", providerID: "anthropic", variant: "default" },
      },
      api,
    });

    expect(calls).toEqual(["agent", "model", "prompt"]);
  });

  test("switches the model when only the variant differs", async () => {
    const { api, calls } = recordingApi();

    await submitComposer({
      state: state({ model: { providerID: "anthropic", modelID: "claude", variant: "thinking" } }),
      session: { id: "ses_1", model: { id: "claude", providerID: "anthropic", variant: undefined } },
      api,
    });

    expect(calls).toEqual(["model", "prompt"]);
  });

  test("does not switch the agent when none is selected in the draft", async () => {
    const { api, calls } = recordingApi();

    await submitComposer({
      state: state(),
      session: { id: "ses_1", agent: "planner", model: { id: "claude", providerID: "anthropic" } },
      api,
    });

    expect(calls).toEqual(["prompt"]);
  });

  test("creates a session with the selection when none exists", async () => {
    const created: { agent?: string; model?: ModelRef }[] = [];
    const { prompts } = recordingApi();
    const api: ComposerApi = {
      createSession: async (input) => {
        created.push(input);
        return { id: "ses_new" };
      },
      switchAgent: async () => {},
      switchModel: async () => {},
      prompt: async (input) => {
        prompts.push(input);
      },
    };

    const result = await submitComposer({
      state: state({ agent: "coder", model: { providerID: "openai", modelID: "gpt-5", variant: null } }),
      api,
    });

    expect(created).toEqual([
      { agent: "coder", model: { id: "gpt-5", providerID: "openai", variant: undefined } },
    ]);
    expect(result.sessionID).toBe("ses_new");
    expect(prompts[0].sessionID).toBe("ses_new");
  });

  test("defaults to steer delivery", async () => {
    const { api, prompts } = recordingApi();

    await submitComposer({ state: state(), session: { id: "ses_1" }, api });

    expect(prompts[0].delivery).toBe("steer");
  });

  test("passes through queue delivery", async () => {
    const { api, prompts } = recordingApi();

    await submitComposer({ state: state(), session: { id: "ses_1" }, api, delivery: "queue" });

    expect(prompts[0].delivery).toBe("queue");
  });

  test("rejects when there is nothing to submit", async () => {
    const { api } = recordingApi();

    await expect(
      submitComposer({
        state: { prompt: [{ type: "text", content: "", start: 0, end: 0 }], cursor: 0 },
        api,
      }),
    ).rejects.toThrow();
  });
});

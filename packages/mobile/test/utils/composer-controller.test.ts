import { describe, expect, test } from "bun:test";
import type { ComposerState, Suggestion } from "@/types/composer";
import { createComposerController, type ComposerControllerInput } from "@/utils/composer-controller";
import { createComposerStore } from "@/utils/composer-store";

const agent: Suggestion = {
  id: "agent:coder",
  kind: "agent",
  label: "@coder",
  mention: { type: "agent", name: "coder", content: "@coder", start: 0, end: 0 },
};
const command: Suggestion = {
  id: "custom.review",
  kind: "command",
  label: "/review",
  trigger: "review",
  title: "review",
};
const file: Suggestion = {
  id: "file:src/app.ts",
  kind: "file",
  label: "src/app.ts",
  path: "src/app.ts",
  mention: { type: "file", path: "src/app.ts", content: "@src/app.ts", start: 0, end: 0 },
};

function createHarness(overrides: Partial<ComposerControllerInput> = {}) {
  let state: ComposerState = {
    prompt: [{ type: "text", content: "", start: 0, end: 0 }],
    cursor: 0,
  };
  const draft = createComposerStore({
    get: () => state,
    set: (next) => {
      state =
        typeof next === "function"
          ? (next as (current: ComposerState) => ComposerState)(state)
          : next;
    },
  });
  const calls: string[] = [];
  const controller = createComposerController({
    draft,
    context: () => [agent],
    commands: () => [command],
    searchFiles: async (query) => (query === "app" ? [file] : []),
    runCommand: async (item) => {
      calls.push(`command:${item.trigger}`);
    },
    submit: async () => {
      calls.push("submit");
      return { sessionID: "ses_1" };
    },
    stop: async () => {
      calls.push("stop");
    },
    ...overrides,
  });
  return { controller, draft, getState: () => state, calls };
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("composer controller", () => {
  test("typing persists text through the draft", () => {
    const { controller, getState } = createHarness();

    controller.onChangeText("hello", 5);

    expect(getState().prompt[0].content).toBe("hello");
    expect(controller.value()).toBe("hello");
    expect(controller.state().popover).toEqual({ type: "closed" });
  });

  test("typing @ opens the context popover with filtered suggestions", () => {
    const { controller } = createHarness();

    controller.onChangeText("hi @co", 6);

    expect(controller.state().popover).toEqual({ type: "context", query: "co" });
    expect(controller.suggestions().map((s) => s.id)).toEqual(["agent:coder"]);
  });

  test("typing / as the whole prompt opens the command popover", () => {
    const { controller } = createHarness();

    controller.onChangeText("/re", 3);

    expect(controller.state().popover).toEqual({ type: "command-inline", query: "re" });
    expect(controller.suggestions().map((s) => s.id)).toEqual(["custom.review"]);
  });

  test("openCommands opens the searchable command menu without editing the draft", () => {
    const { controller, getState } = createHarness();

    controller.onChangeText("hello", 5);
    controller.openCommands();

    expect(controller.state().popover).toEqual({ type: "command-menu", query: "" });
    expect(getState().prompt[0].content).toBe("hello");
  });

  test("openContext opens the context sheet without editing the draft", () => {
    const { controller, getState } = createHarness();

    controller.onChangeText("hello", 5);
    controller.openContext();

    expect(controller.state().popover).toEqual({ type: "context", query: "" });
    expect(getState().prompt[0].content).toBe("hello");
  });

  test("selecting a mention adds the part and closes the popover", () => {
    const { controller, getState } = createHarness();

    controller.openContext();
    controller.select(agent);

    expect(controller.state().popover).toEqual({ type: "closed" });
    expect(getState().prompt.some((part) => part.type === "agent")).toBe(true);
    expect(controller.value()).toContain("@coder");
  });

  test("selecting a command executes it instead of inserting slash text", () => {
    const { controller, getState, calls } = createHarness();

    controller.openCommands();
    controller.select(command);

    expect(controller.state().popover).toEqual({ type: "closed" });
    expect(calls).toEqual(["command:review"]);
    expect(getState().prompt[0].content).toBe("");
  });

  test("setQuery filters the open popover", () => {
    const { controller } = createHarness();

    controller.openContext();
    controller.setQuery("cod");

    expect(controller.suggestions().map((s) => s.id)).toEqual(["agent:coder"]);
  });

  test("file search results surface in the context suggestions", async () => {
    const { controller } = createHarness();

    controller.onChangeText("@app", 4);
    await flushPromises();

    expect(controller.suggestions().map((s) => s.id)).toEqual(["file:src/app.ts"]);
  });

  test("stale file search results are discarded", async () => {
    let resolveSlow!: (results: Suggestion[]) => void;
    const slow = new Promise<Suggestion[]>((resolve) => {
      resolveSlow = resolve;
    });
    const { controller } = createHarness({
      searchFiles: async (query) => {
        if (query === "app") return slow;
        return [];
      },
    });

    controller.onChangeText("@app", 4);
    controller.onChangeText("@ap", 3);
    resolveSlow([{ ...file, id: "file:old.ts", label: "old.ts" }]);
    await flushPromises();

    expect(controller.suggestions().map((s) => s.id)).not.toContain("file:old.ts");
  });

  test("canSubmit reflects whether there is content", () => {
    const { controller } = createHarness();

    expect(controller.canSubmit()).toBe(false);

    controller.onChangeText("go", 2);

    expect(controller.canSubmit()).toBe(true);
  });

  test("submit and stop delegate to the injected handlers", async () => {
    const { controller, calls } = createHarness();

    await controller.submit();
    await controller.stop();

    expect(calls).toEqual(["submit", "stop"]);
  });

  test("submit clears the draft on success", async () => {
    const { controller, getState } = createHarness();

    controller.onChangeText("hello", 5);
    await controller.submit();

    expect(getState().prompt[0].content).toBe("");
    expect(controller.value()).toBe("");
  });

  test("submit keeps the draft when it fails", async () => {
    const { controller, getState } = createHarness({
      submit: async () => {
        throw new Error("boom");
      },
    });

    controller.onChangeText("hello", 5);
    await expect(controller.submit()).rejects.toThrow("boom");

    expect(getState().prompt[0].content).toBe("hello");
  });

  test("removeMention removes a mention part and notifies listeners", () => {
    const { controller, getState } = createHarness();
    let count = 0;
    controller.subscribe(() => {
      count += 1;
    });

    controller.openContext();
    controller.select(agent);
    controller.removeMention(0);

    expect(getState().prompt).toEqual([{ type: "text", content: " ", start: 0, end: 1 }]);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("subscribe notifies listeners on state changes", () => {
    const { controller } = createHarness();
    let count = 0;
    const unsubscribe = controller.subscribe(() => {
      count += 1;
    });

    controller.onChangeText("hi", 2);
    controller.onChangeText("hey", 3);
    unsubscribe();
    controller.onChangeText("x", 1);

    expect(count).toBe(2);
  });

  test("version increments on every mutation", () => {
    const { controller } = createHarness();
    const base = controller.version();

    controller.onChangeText("hi", 2);
    controller.setModel({ providerID: "openai", modelID: "gpt-5", variant: null });
    controller.setAgent("coder");

    expect(controller.version()).toBe(base + 3);
  });

  test("reset clears the draft and closes the popover", () => {
    const { controller, getState } = createHarness();

    controller.onChangeText("hello", 5);
    controller.openContext();
    controller.reset();

    expect(controller.value()).toBe("");
    expect(controller.state().popover).toEqual({ type: "closed" });
    expect(getState().prompt[0].content).toBe("");
  });

  test("model and agent setters update the draft", () => {
    const { controller, getState } = createHarness();

    controller.setModel({ providerID: "openai", modelID: "gpt-5", variant: null });
    controller.setAgent("coder");
    controller.setVariant("thinking");

    expect(getState().model).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
      variant: "thinking",
    });
    expect(getState().agent).toBe("coder");
  });
});

import { beforeEach, describe, expect, test } from "bun:test";
import type { ComposerState, Suggestion } from "@/types/composer";
import type { ComposerApi } from "@/utils/composer-submit";
import { addText, setText } from "@/utils/composer-store";
import {
  composerDispatch,
  composerDraft,
  composerOpenCommands,
  composerOpenContext,
  composerRemoveMention,
  composerReset,
  composerSelect,
  composerSetAgent,
  composerSetCursor,
  composerSetModel,
  composerSetVariant,
  composerStore,
  composerSubmit,
  composerUpdateDraft,
} from "@/stores/composer";

const EMPTY_SHAPE: ComposerState = {
  prompt: [{ type: "text", content: "", start: 0, end: 0 }],
  cursor: 0,
};

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

const noFiles = async (): Promise<Suggestion[]> => [];

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const api: ComposerApi = {
  create: async () => ({ id: "ses_new" }),
  switchAgent: async () => {},
  switchModel: async () => {},
  prompt: async () => {},
};

beforeEach(() => {
  composerStore.setState({ drafts: {}, interaction: {}, files: {} });
});

describe("composer drafts", () => {
  test("returns the empty draft for an unknown session", () => {
    expect(composerDraft("ses_1")).toEqual(EMPTY_SHAPE);
  });

  test("writes and reads drafts through the update helper", () => {
    composerUpdateDraft("ses_1", (state) => setText(state, "hi"));

    expect(composerDraft("ses_1").prompt).toEqual([
      { type: "text", content: "hi", start: 0, end: 2 },
    ]);
  });

  test("supports functional updates against the current draft", () => {
    composerUpdateDraft("ses_2", (state) => setText(state, "hello"));
    composerUpdateDraft("ses_2", (state) => addText(state, " world"));

    expect(composerDraft("ses_2").prompt[0].content).toBe("hello world");
    expect(composerDraft("ses_2").cursor).toBe(11);
  });

  test("keeps drafts isolated per session", () => {
    composerUpdateDraft("ses_3", (state) => setText(state, "a"));

    expect(composerDraft("ses_4")).toEqual(EMPTY_SHAPE);
    expect(composerDraft("ses_3").prompt[0].content).toBe("a");
  });

  test("reset clears the draft", () => {
    composerUpdateDraft("ses_5", (state) => setText(state, "x"));

    composerReset("ses_5");

    expect(composerDraft("ses_5")).toEqual(EMPTY_SHAPE);
  });
});

describe("composer interaction helpers", () => {
  test("typing persists text and closes the popover", () => {
    composerDispatch("s", { type: "input.changed", value: "hello" }, noFiles);

    expect(composerStore.getState().drafts.s?.prompt[0].content).toBe("hello");
    expect(composerStore.getState().interaction.s).toEqual({ popover: { type: "closed" } });
  });

  test("typing @ opens the context popover", () => {
    composerDispatch("s", { type: "input.changed", value: "hi @co" }, noFiles);

    expect(composerStore.getState().interaction.s).toEqual({
      popover: { type: "context", query: "co" },
    });
  });

  test("typing / as the whole prompt opens the command popover", () => {
    composerDispatch("s", { type: "input.changed", value: "/re" }, noFiles);

    expect(composerStore.getState().interaction.s).toEqual({
      popover: { type: "command-inline", query: "re" },
    });
  });

  test("openCommands opens the searchable command menu without editing the draft", () => {
    composerDispatch("s", { type: "input.changed", value: "hello" }, noFiles);
    composerOpenCommands("s");

    expect(composerStore.getState().interaction.s).toEqual({
      popover: { type: "command-menu", query: "" },
    });
    expect(composerStore.getState().drafts.s?.prompt[0].content).toBe("hello");
  });

  test("openContext opens the context popover without editing the draft", () => {
    composerDispatch("s", { type: "input.changed", value: "hello" }, noFiles);
    composerOpenContext("s");

    expect(composerStore.getState().interaction.s).toEqual({
      popover: { type: "context", query: "" },
    });
    expect(composerStore.getState().drafts.s?.prompt[0].content).toBe("hello");
  });

  test("setQuery updates the popover query", () => {
    composerOpenContext("s");
    composerDispatch("s", { type: "popover.query", value: "cod" }, noFiles);

    expect(composerStore.getState().interaction.s).toEqual({
      popover: { type: "context", query: "cod", activeID: undefined },
    });
  });

  test("selecting a mention adds the part and closes the popover", () => {
    composerOpenContext("s");
    composerSelect("s", agent, { runCommand: () => {} });

    expect(composerStore.getState().interaction.s).toEqual({ popover: { type: "closed" } });
    expect(composerStore.getState().drafts.s?.prompt.some((part) => part.type === "agent")).toBe(true);
  });

  test("selecting a command runs it instead of inserting slash text", () => {
    const ran: string[] = [];
    composerOpenCommands("s");
    composerSelect("s", command, {
      runCommand: (item) => {
        ran.push(item.trigger ?? "");
      },
    });

    expect(ran).toEqual(["review"]);
    expect(composerStore.getState().interaction.s).toEqual({ popover: { type: "closed" } });
    expect(composerStore.getState().drafts.s).toBeUndefined();
  });

  test("file search results are stored for the context popover", async () => {
    const search = async (query: string): Promise<Suggestion[]> =>
      query === "app" ? [file] : [];

    composerDispatch("s", { type: "input.changed", value: "@app" }, search);
    await flushPromises();

    expect(composerStore.getState().files.s).toEqual([file]);
  });

  test("stale file search results are discarded", async () => {
    let resolveSlow!: (results: Suggestion[]) => void;
    const slow = new Promise<Suggestion[]>((resolve) => {
      resolveSlow = resolve;
    });
    const search = async (query: string): Promise<Suggestion[]> =>
      query === "app" ? slow : [];

    composerDispatch("s", { type: "input.changed", value: "@app" }, search);
    composerDispatch("s", { type: "input.changed", value: "@ap" }, search);
    resolveSlow([file]);
    await flushPromises();

    expect(composerStore.getState().files.s).toEqual([]);
  });

  test("file search staleness is isolated per session", async () => {
    let resolveA!: (results: Suggestion[]) => void;
    const slowA = new Promise<Suggestion[]>((resolve) => {
      resolveA = resolve;
    });
    const search = async (query: string): Promise<Suggestion[]> =>
      query === "app" ? slowA : [];

    composerDispatch("a", { type: "input.changed", value: "@app" }, search);
    composerDispatch("b", { type: "input.changed", value: "@app" }, search);
    resolveA([file]);
    await flushPromises();

    expect(composerStore.getState().files.a).toEqual([file]);
    expect(composerStore.getState().files.b).toEqual([file]);
  });

  test("removeMention removes a mention part", () => {
    composerOpenContext("s");
    composerSelect("s", agent, { runCommand: () => {} });
    composerRemoveMention("s", 0);

    expect(composerStore.getState().drafts.s?.prompt).toEqual([
      { type: "text", content: " ", start: 0, end: 1 },
    ]);
  });

  test("setCursor updates the draft cursor", () => {
    composerSetCursor("s", 3);

    expect(composerStore.getState().drafts.s?.cursor).toBe(3);
  });

  test("model and agent setters update the draft", () => {
    composerSetModel("s", { providerID: "openai", modelID: "gpt-5", variant: null });
    composerSetAgent("s", "coder");
    composerSetVariant("s", "thinking");

    expect(composerStore.getState().drafts.s?.model).toEqual({
      providerID: "openai",
      modelID: "gpt-5",
      variant: "thinking",
    });
    expect(composerStore.getState().drafts.s?.agent).toBe("coder");
  });

  test("submit clears the draft on success", async () => {
    composerDispatch("s", { type: "input.changed", value: "hello" }, noFiles);

    await composerSubmit("s", {
      state: composerStore.getState().drafts.s!,
      session: undefined,
      api,
    });

    expect(composerStore.getState().drafts.s).toBeUndefined();
  });

  test("submit keeps the draft when it fails", async () => {
    composerDispatch("s", { type: "input.changed", value: "hello" }, noFiles);
    const failing: ComposerApi = {
      ...api,
      prompt: async () => {
        throw new Error("boom");
      },
    };

    await expect(
      composerSubmit("s", {
        state: composerStore.getState().drafts.s!,
        session: undefined,
        api: failing,
      }),
    ).rejects.toThrow("boom");

    expect(composerStore.getState().drafts.s?.prompt[0].content).toBe("hello");
  });

  test("reset clears all composer state", () => {
    composerDispatch("s", { type: "input.changed", value: "hello" }, noFiles);
    composerReset("s");

    expect(composerStore.getState().drafts.s).toBeUndefined();
    expect(composerStore.getState().interaction.s).toBeUndefined();
    expect(composerStore.getState().files.s).toBeUndefined();
  });
});

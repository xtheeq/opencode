import { describe, expect, test } from "bun:test";
import { createComposerStore, type ComposerStoreAccess } from "@/utils/composer-store";
import type { ComposerState } from "@/types/composer";

function createHarness(initial: ComposerState) {
  let state = initial;
  const access: ComposerStoreAccess = {
    get: () => state,
    set: (next) => {
      state =
        typeof next === "function"
          ? (next as (current: ComposerState) => ComposerState)(state)
          : next;
    },
  };
  const store = createComposerStore(access);
  return { store, getState: () => state };
}

function createPromptStore() {
  return createHarness({
    prompt: [{ type: "text", content: "old", start: 0, end: 3 }],
    cursor: 3,
    model: { providerID: "anthropic", modelID: "claude-sonnet", variant: null },
  });
}

describe("composer store", () => {
  test("updates prompt text and cursor together while preserving structured parts", () => {
    const { store, getState } = createHarness({
      prompt: [
        { type: "text", content: "old", start: 0, end: 3 },
        { type: "file", path: "one", content: "@one", start: 3, end: 7 },
      ],
      cursor: 3,
    });

    store.setText("updated");

    expect(getState().prompt).toEqual([
      { type: "text", content: "updated", start: 0, end: 7 },
      { type: "file", path: "one", content: "@one", start: 7, end: 11 },
    ]);
    expect(getState().cursor).toBe(7);
  });

  test("inserts text without flattening structured mentions", () => {
    const { store, getState } = createHarness({
      prompt: [
        { type: "text", content: "A ", start: 0, end: 2 },
        { type: "file", path: "one", content: "@one", start: 2, end: 6 },
        { type: "text", content: " B", start: 6, end: 8 },
      ],
      cursor: 2,
    });

    store.addText("X\nY");

    expect(getState().prompt).toEqual([
      { type: "text", content: "A X\nY", start: 0, end: 5 },
      { type: "file", path: "one", content: "@one", start: 5, end: 9 },
      { type: "text", content: " B", start: 9, end: 11 },
    ]);
    expect(getState().cursor).toBe(5);
  });

  test("adds mentions and mutates the model through shared actions", () => {
    const { store, getState } = createPromptStore();

    store.addMention({ type: "file", path: "src/app.ts", content: "@src/app.ts", start: 0, end: 0 });
    store.setVariant("thinking");

    expect(getState().prompt).toEqual([
      { type: "text", content: "old", start: 0, end: 3 },
      { type: "file", path: "src/app.ts", content: "@src/app.ts", start: 3, end: 14 },
      { type: "text", content: " ", start: 14, end: 15 },
    ]);
    expect(getState().model?.variant).toBe("thinking");

    store.setPrompt([{ type: "text", content: "old", start: 0, end: 3 }], 3);
    store.setModel(undefined);

    expect(getState().prompt).toEqual([{ type: "text", content: "old", start: 0, end: 3 }]);
    expect(getState().model).toBeUndefined();
  });

  test("resets the prompt and cursor", () => {
    const { store, getState } = createPromptStore();

    store.reset();

    expect(getState().prompt).toEqual([{ type: "text", content: "", start: 0, end: 0 }]);
    expect(getState().cursor).toBe(0);
  });

  test("setModel updates the whole selection and setVariant only when a model exists", () => {
    const { store, getState } = createPromptStore();

    store.setVariant(null);
    expect(getState().model?.variant).toBeNull();

    store.setModel({ providerID: "openai", modelID: "gpt-5", variant: undefined });
    expect(getState().model).toEqual({ providerID: "openai", modelID: "gpt-5", variant: undefined });

    store.setModel(undefined);
    store.setVariant("thinking");
    expect(getState().model).toBeUndefined();
  });

  test("setAgent updates the draft agent", () => {
    const { store, getState } = createPromptStore();

    store.setAgent("planner");
    expect(getState().agent).toBe("planner");

    store.setAgent(undefined);
    expect(getState().agent).toBeUndefined();
  });

  test("removeMention removes a part and re-aligns offsets", () => {
    const { store, getState } = createHarness({
      prompt: [
        { type: "text", content: "A ", start: 0, end: 2 },
        { type: "agent", name: "coder", content: "@coder", start: 2, end: 8 },
        { type: "text", content: " B", start: 8, end: 10 },
      ],
      cursor: 10,
    });

    store.removeMention(1);

    expect(getState().prompt).toEqual([
      { type: "text", content: "A ", start: 0, end: 2 },
      { type: "text", content: " B", start: 2, end: 4 },
    ]);
    expect(getState().cursor).toBe(4);
  });

  test("removeMention ignores invalid indexes", () => {
    const { store, getState } = createHarness({
      prompt: [{ type: "text", content: "hi", start: 0, end: 2 }],
      cursor: 2,
    });

    store.removeMention(5);
    store.removeMention(-1);

    expect(getState().prompt).toHaveLength(1);
  });
});

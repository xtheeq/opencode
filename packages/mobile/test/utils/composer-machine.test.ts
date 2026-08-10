import { describe, expect, test } from "bun:test";
import { createInteractionState, transition } from "@/utils/composer-machine";
import type { ComposerState, Suggestion } from "@/types/composer";

const command: Suggestion = {
  id: "review",
  kind: "command",
  label: "/review",
};

function persisted(value = ""): ComposerState {
  return {
    prompt: [{ type: "text", content: value, start: 0, end: value.length }],
    cursor: value.length,
  };
}

describe("composer interaction machine", () => {
  test("opens inline commands only when slash is the entire prompt", () => {
    const state = createInteractionState();
    const open = transition(state, { type: "input.changed", value: "/re" }, persisted());
    const closed = transition(state, { type: "input.changed", value: "explain /re" }, persisted());

    expect(open.state.popover).toEqual({ type: "command-inline", query: "re" });
    expect(closed.state.popover).toEqual({ type: "closed" });
  });

  test("completes nested slash command names", () => {
    const open = transition(
      createInteractionState(),
      { type: "input.changed", value: "/review/" },
      persisted(),
    );
    const item = { ...command, label: "/review/nested" };
    const selected = transition(open.state, { type: "popover.select", item }, persisted("/review/"));

    expect(open.state.popover).toEqual({ type: "command-inline", query: "review/" });
    expect(selected.commands).toContainEqual({ type: "draft.setText", value: "/review/nested " });
  });

  test("opens context completion at the cursor", () => {
    const value = "alpha @sr omega";
    const input = persisted(value);
    input.cursor = 9;

    const result = transition(
      createInteractionState(),
      { type: "input.changed", value, persist: false },
      input,
    );

    expect(result.state.popover).toEqual({ type: "context", query: "sr" });
  });

  test("opens the searchable command menu for a populated draft", () => {
    const result = transition(
      createInteractionState(),
      { type: "commands.open" },
      persisted("existing text"),
    );

    expect(result.state.popover).toEqual({ type: "command-menu", query: "" });
  });

  test("prepends a menu command and preserves existing text as arguments", () => {
    const open = transition(
      createInteractionState(),
      { type: "commands.open" },
      persisted("existing text"),
    );
    const selected = transition(
      open.state,
      { type: "popover.select", item: command },
      persisted("existing text"),
    );

    expect(selected.commands).toContainEqual({
      type: "draft.setText",
      value: "/review existing text",
    });
    expect(selected.state.popover).toEqual({ type: "closed" });
  });

  test("stores selected context items as prompt file parts", () => {
    const item: Suggestion = {
      id: "src/index.ts",
      kind: "file",
      label: "index.ts",
      path: "src/index.ts",
    };
    const state = {
      ...createInteractionState(),
      popover: { type: "context" as const, query: "index" },
    };

    const selected = transition(state, { type: "popover.select", item }, persisted("@index"));

    expect(selected.commands).toContainEqual({ type: "mention.add", item });
  });

  test("emits draft.setText for ordinary input and closes a stale popover", () => {
    const state = {
      ...createInteractionState(),
      popover: { type: "context" as const, query: "sr", activeID: "first" },
    };

    const result = transition(state, { type: "input.changed", value: "plain" }, persisted());

    expect(result.commands).toContainEqual({ type: "draft.setText", value: "plain" });
    expect(result.state.popover).toEqual({ type: "closed" });
  });

  test("keeps the command menu open when ordinary text is typed", () => {
    const open = transition(
      createInteractionState(),
      { type: "commands.open" },
      persisted("existing"),
    );

    const result = transition(open.state, { type: "input.changed", value: "existing" }, persisted("existing"));

    expect(result.state.popover).toEqual({ type: "command-menu", query: "" });
  });

  test("opens context completion from an explicit trigger", () => {
    const result = transition(createInteractionState(), { type: "context.open" }, persisted("hello"));

    expect(result.state.popover).toEqual({ type: "context", query: "" });
    expect(result.commands).toContainEqual({ type: "draft.setText", value: "hello@" });
  });

  test("filters the popover query and resets the active item", () => {
    const state = {
      ...createInteractionState(),
      popover: { type: "context" as const, query: "ab", activeID: "x" },
    };

    const result = transition(state, { type: "popover.query", value: "a" }, persisted());

    expect(result.state.popover).toEqual({ type: "context", query: "a", activeID: undefined });
    expect(result.commands).toContainEqual({ type: "popover.filter", popover: "context", query: "a" });
  });

  test("activates the first result when the active item is stale", () => {
    const state = {
      ...createInteractionState(),
      popover: { type: "context" as const, query: "", activeID: "stale" },
    };

    const result = transition(state, { type: "popover.results", ids: ["a", "b"] }, persisted());

    expect(result.state.popover).toEqual({ type: "context", query: "", activeID: "a" });
  });

  test("closes the popover explicitly", () => {
    const state = {
      ...createInteractionState(),
      popover: { type: "context" as const, query: "", activeID: "a" },
    };

    const result = transition(state, { type: "popover.close" }, persisted());

    expect(result.state.popover).toEqual({ type: "closed" });
  });
});

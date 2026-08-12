import { describe, expect, test } from "bun:test";
import {
  addMention,
  addText,
  removeMention,
  resetPrompt,
  setAgent,
  setModel,
  setPrompt,
  setText,
  setVariant,
} from "@/utils/composer-store";
import type { ComposerState } from "@/types/composer";

const draft = (content: string, cursor = content.length): ComposerState => ({
  prompt: [{ type: "text", content, start: 0, end: content.length }],
  cursor,
});

describe("composer store", () => {
  test("setText preserves structured parts and re-aligns offsets", () => {
    const result = setText(
      {
        prompt: [
          { type: "text", content: "old", start: 0, end: 3 },
          { type: "file", path: "one", content: "@one", start: 3, end: 7 },
        ],
        cursor: 3,
      },
      "updated",
    );

    expect(result.prompt).toEqual([
      { type: "text", content: "updated", start: 0, end: 7 },
      { type: "file", path: "one", content: "@one", start: 7, end: 11 },
    ]);
    expect(result.cursor).toBe(7);
  });

  test("addText inserts without flattening structured mentions", () => {
    const result = addText(
      {
        prompt: [
          { type: "text", content: "A ", start: 0, end: 2 },
          { type: "file", path: "one", content: "@one", start: 2, end: 6 },
          { type: "text", content: " B", start: 6, end: 8 },
        ],
        cursor: 2,
      },
      "X\nY",
    );

    expect(result.prompt).toEqual([
      { type: "text", content: "A X\nY", start: 0, end: 5 },
      { type: "file", path: "one", content: "@one", start: 5, end: 9 },
      { type: "text", content: " B", start: 9, end: 11 },
    ]);
    expect(result.cursor).toBe(5);
  });

  test("addMention inserts at the cursor", () => {
    const result = addMention(draft("old", 3), {
      type: "file",
      path: "src/app.ts",
      content: "@src/app.ts",
      start: 0,
      end: 0,
    });

    expect(result.prompt).toEqual([
      { type: "text", content: "old", start: 0, end: 3 },
      { type: "file", path: "src/app.ts", content: "@src/app.ts", start: 3, end: 14 },
      { type: "text", content: " ", start: 14, end: 15 },
    ]);
  });

  test("model and agent setters update the selection", () => {
    const withVariant = setVariant(
      setModel(draft("old"), { providerID: "anthropic", modelID: "claude-sonnet", variant: null }),
      "thinking",
    );

    expect(withVariant.model).toEqual({
      providerID: "anthropic",
      modelID: "claude-sonnet",
      variant: "thinking",
    });
    expect(setModel(withVariant, undefined).model).toBeUndefined();
    expect(setAgent(draft("old"), "planner").agent).toBe("planner");
  });

  test("setVariant is a no-op when no model is selected", () => {
    const state = draft("old");

    expect(setVariant(state, "thinking")).toBe(state);
  });

  test("removeMention removes a part and clamps the cursor", () => {
    const result = removeMention(
      {
        prompt: [
          { type: "text", content: "A ", start: 0, end: 2 },
          { type: "agent", name: "coder", content: "@coder", start: 2, end: 8 },
          { type: "text", content: " B", start: 8, end: 10 },
        ],
        cursor: 10,
      },
      1,
    );

    expect(result.prompt).toEqual([
      { type: "text", content: "A ", start: 0, end: 2 },
      { type: "text", content: " B", start: 2, end: 4 },
    ]);
    expect(result.cursor).toBe(4);
  });

  test("removeMention ignores invalid indexes", () => {
    const state = draft("hi");

    expect(removeMention(state, 5)).toBe(state);
    expect(removeMention(state, -1)).toBe(state);
  });

  test("resetPrompt clears the prompt and cursor", () => {
    const result = resetPrompt(draft("hello"));

    expect(result.prompt).toEqual([{ type: "text", content: "", start: 0, end: 0 }]);
    expect(result.cursor).toBe(0);
  });

  test("setPrompt replaces the prompt", () => {
    const result = setPrompt(draft("hello"), [{ type: "text", content: "x", start: 0, end: 1 }], 1);

    expect(result.prompt).toEqual([{ type: "text", content: "x", start: 0, end: 1 }]);
    expect(result.cursor).toBe(1);
  });
});

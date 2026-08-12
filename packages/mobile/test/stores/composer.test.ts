import { describe, expect, test } from "bun:test";
import { composerAccess, composerDraft, resetComposerDraft } from "@/stores/composer";
import { createComposerStore } from "@/utils/composer-store";
import type { ComposerState } from "@/types/composer";

const EMPTY_SHAPE: ComposerState = {
  prompt: [{ type: "text", content: "", start: 0, end: 0 }],
  cursor: 0,
};

const draft = (content: string): ComposerState => ({
  prompt: [{ type: "text", content, start: 0, end: content.length }],
  cursor: content.length,
});

describe("composer drafts", () => {
  test("returns the empty draft for an unknown session", () => {
    expect(composerDraft("ses_1")).toEqual(EMPTY_SHAPE);
  });

  test("writes and reads drafts through the session accessor", () => {
    composerAccess("ses_1").set(draft("hi"));

    expect(composerDraft("ses_1").prompt).toEqual([
      { type: "text", content: "hi", start: 0, end: 2 },
    ]);
  });

  test("supports functional updates against the current draft", () => {
    const store = createComposerStore(composerAccess("ses_2"));

    store.setText("hello");
    store.addText(" world");

    expect(composerDraft("ses_2").prompt[0].content).toBe("hello world");
    expect(composerDraft("ses_2").cursor).toBe(11);
  });

  test("keeps drafts isolated per session", () => {
    composerAccess("ses_3").set(draft("a"));

    expect(composerDraft("ses_4")).toEqual(EMPTY_SHAPE);
    expect(composerDraft("ses_3").prompt[0].content).toBe("a");
  });

  test("reset removes the draft", () => {
    composerAccess("ses_5").set(draft("x"));

    resetComposerDraft("ses_5");

    expect(composerDraft("ses_5")).toEqual(EMPTY_SHAPE);
  });
});

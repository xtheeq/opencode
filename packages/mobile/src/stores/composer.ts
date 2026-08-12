import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type { ComposerState } from "@/types/composer";
import type { ComposerStoreAccess } from "@/utils/composer-store";

export type ComposerDrafts = {
  drafts: Record<string, ComposerState>;
};

const EMPTY_DRAFT: ComposerState = {
  prompt: [{ type: "text", content: "", start: 0, end: 0 }],
  cursor: 0,
};

export const composerDrafts = create<ComposerDrafts>()(
  immer(() => ({
    drafts: {},
  })),
);

export function composerAccess(sessionID: string): ComposerStoreAccess {
  return {
    get: () => composerDrafts.getState().drafts[sessionID] ?? EMPTY_DRAFT,
    set: (next) => {
      composerDrafts.setState((state) => {
        const current = state.drafts[sessionID] ?? EMPTY_DRAFT;
        state.drafts[sessionID] = typeof next === "function" ? next(current) : next;
      });
    },
  };
}

export function composerDraft(sessionID: string): ComposerState {
  return composerDrafts.getState().drafts[sessionID] ?? EMPTY_DRAFT;
}

export function useComposerDraft(sessionID: string): ComposerState {
  return composerDrafts(useShallow((state) => state.drafts[sessionID] ?? EMPTY_DRAFT));
}

export function resetComposerDraft(sessionID: string) {
  composerDrafts.setState((state) => {
    delete state.drafts[sessionID];
  });
}

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import type { ComposerState, Suggestion } from "@/types/composer";
import {
  addMention,
  removeMention,
  setAgent,
  setCursor,
  setModel,
  setText,
  setVariant,
} from "@/utils/composer-store";
import type { InteractionCommand, InteractionEvent, InteractionState } from "@/utils/composer-machine";
import { createInteractionState, transition } from "@/utils/composer-machine";
import type { ComposerSubmitInput } from "@/utils/composer-submit";
import { submitComposer } from "@/utils/composer-submit";

export type ComposerStoreState = {
  drafts: Record<string, ComposerState>;
  interaction: Record<string, InteractionState>;
  files: Record<string, Suggestion[]>;
};

const EMPTY_DRAFT: ComposerState = {
  prompt: [{ type: "text", content: "", start: 0, end: 0 }],
  cursor: 0,
};

const EMPTY_INTERACTION: InteractionState = { popover: { type: "closed" } };

const EMPTY_FILES: Suggestion[] = [];

export const composerStore = create<ComposerStoreState>()(
  immer(() => ({
    drafts: {},
    interaction: {},
    files: {},
  })),
);

export function composerDraft(sessionID: string): ComposerState {
  return composerStore.getState().drafts[sessionID] ?? EMPTY_DRAFT;
}

export function useComposerDraft(sessionID: string): ComposerState {
  return composerStore(useShallow((state) => state.drafts[sessionID] ?? EMPTY_DRAFT));
}

export function useComposerInteraction(sessionID: string): InteractionState {
  return composerStore(useShallow((state) => state.interaction[sessionID] ?? EMPTY_INTERACTION));
}

export function useComposerFiles(sessionID: string): Suggestion[] {
  return composerStore(useShallow((state) => state.files[sessionID] ?? EMPTY_FILES));
}

export function composerUpdateDraft(
  sessionID: string,
  fn: (state: ComposerState) => ComposerState,
) {
  composerStore.setState((state) => {
    const current = state.drafts[sessionID] ?? EMPTY_DRAFT;
    state.drafts[sessionID] = fn(current);
  });
}

export function composerDispatch(
  sessionID: string,
  event: InteractionEvent,
  searchFiles?: (query: string) => Promise<Suggestion[]>,
) {
  const state = composerStore.getState();
  const previous = state.interaction[sessionID] ?? EMPTY_INTERACTION;
  const result = transition(previous, event, state.drafts[sessionID] ?? EMPTY_DRAFT);
  composerStore.setState((s) => {
    s.interaction[sessionID] = result.state;
    const current = s.drafts[sessionID] ?? EMPTY_DRAFT;
    let draft = current;
    for (const command of result.commands) draft = applyComposerCommand(draft, command);
    if (draft !== current) s.drafts[sessionID] = draft;
  });
  refreshComposerSearch(sessionID, previous, result.state, searchFiles);
}

function applyComposerCommand(state: ComposerState, command: InteractionCommand): ComposerState {
  if (command.type === "draft.setText") return setText(state, command.value);
  if (command.type === "mention.add") {
    return command.item.mention ? addMention(state, command.item.mention) : state;
  }
  return state;
}

function refreshComposerSearch(
  sessionID: string,
  previous: InteractionState,
  next: InteractionState,
  searchFiles?: (query: string) => Promise<Suggestion[]>,
) {
  if (next.popover.type !== "context") {
    composerStore.setState((s) => {
      if (s.files[sessionID] !== undefined) delete s.files[sessionID];
    });
    return;
  }
  const previousQuery = previous.popover.type === "context" ? previous.popover.query : undefined;
  if (next.popover.query !== previousQuery) {
    runComposerSearch(sessionID, next.popover.query, searchFiles);
  }
}

// Staleness guard is keyed per session so a search in one composer does not
// invalidate an in-flight search in another (both are mounted in the stack).
const searchTokens = new Map<string, number>();

function runComposerSearch(
  sessionID: string,
  query: string,
  searchFiles?: (query: string) => Promise<Suggestion[]>,
) {
  const token = (searchTokens.get(sessionID) ?? 0) + 1;
  searchTokens.set(sessionID, token);
  if (!searchFiles) return;
  searchFiles(query).then(
    (results) => {
      if (searchTokens.get(sessionID) !== token) return;
      composerStore.setState((s) => {
        s.files[sessionID] = results;
      });
    },
    () => {
      if (searchTokens.get(sessionID) !== token) return;
      composerStore.setState((s) => {
        delete s.files[sessionID];
      });
    },
  );
}

export function composerSelect(
  sessionID: string,
  item: Suggestion,
  input: {
    runCommand: (item: Suggestion) => void;
    searchFiles?: (query: string) => Promise<Suggestion[]>;
  },
) {
  if (item.kind === "command") {
    composerClosePopover(sessionID);
    input.runCommand(item);
    return;
  }
  composerDispatch(sessionID, { type: "popover.select", item }, input.searchFiles);
}

export function composerOpenCommands(sessionID: string) {
  composerStore.setState((s) => {
    s.interaction[sessionID] = { popover: { type: "command-menu", query: "" } };
  });
}

export function composerOpenContext(sessionID: string) {
  composerStore.setState((s) => {
    s.interaction[sessionID] = { popover: { type: "context", query: "" } };
    delete s.files[sessionID];
  });
}

export function composerClosePopover(sessionID: string) {
  composerStore.setState((s) => {
    const current = s.interaction[sessionID];
    if (current) s.interaction[sessionID] = { ...current, popover: { type: "closed" } };
  });
}

export function composerReset(sessionID: string) {
  searchTokens.delete(sessionID);
  composerStore.setState((s) => {
    delete s.drafts[sessionID];
    delete s.interaction[sessionID];
    delete s.files[sessionID];
  });
}

export function composerSetCursor(sessionID: string, cursor: number) {
  composerStore.setState((s) => {
    const draft = s.drafts[sessionID];
    if (draft && draft.cursor === cursor) return;
    s.drafts[sessionID] = setCursor(draft ?? EMPTY_DRAFT, cursor);
  });
}

export function composerRemoveMention(sessionID: string, index: number) {
  composerUpdateDraft(sessionID, (state) => removeMention(state, index));
}

export function composerSetModel(sessionID: string, model: ComposerState["model"]) {
  composerUpdateDraft(sessionID, (state) => setModel(state, model));
}

export function composerSetAgent(sessionID: string, agent: string | undefined) {
  composerUpdateDraft(sessionID, (state) => setAgent(state, agent));
}

export function composerSetVariant(sessionID: string, variant: string | null) {
  composerUpdateDraft(sessionID, (state) => setVariant(state, variant));
}

export async function composerSubmit(sessionID: string, input: ComposerSubmitInput) {
  const result = await submitComposer(input);
  composerReset(sessionID);
  return result;
}

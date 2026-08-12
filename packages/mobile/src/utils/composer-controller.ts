import type { ComposerState, Suggestion } from "@/types/composer";
import type { ComposerStore } from "./composer-store";
import type { InteractionCommand, InteractionEvent, InteractionState } from "./composer-machine";
import { createInteractionState, transition } from "./composer-machine";
import { filterSuggestions } from "./composer-suggestions";

export type ComposerControllerInput = {
  draft: ComposerStore;
  context: () => Suggestion[];
  commands: () => Suggestion[];
  searchFiles: (query: string) => Promise<Suggestion[]>;
  runCommand: (command: Suggestion) => Promise<void>;
  submit: () => Promise<{ sessionID: string }>;
  stop: () => Promise<void>;
};

export type ComposerController = {
  state: () => InteractionState;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
  onChangeText: (value: string, cursor?: number) => void;
  onCursor: (cursor: number) => void;
  openCommands: () => void;
  openContext: () => void;
  closePopover: () => void;
  setQuery: (value: string) => void;
  setActive: (id: string) => void;
  select: (item: Suggestion) => void;
  suggestions: () => Suggestion[];
  canSubmit: () => boolean;
  submit: () => Promise<{ sessionID: string }>;
  stop: () => Promise<void>;
  reset: () => void;
  value: () => string;
  parts: () => ComposerState["prompt"];
  removeMention: (index: number) => void;
  setModel: (model: ComposerState["model"]) => void;
  setAgent: (agent: string | undefined) => void;
  setVariant: (variant: string | null) => void;
};

export function createComposerController(input: ComposerControllerInput): ComposerController {
  let interaction: InteractionState = createInteractionState();
  let files: Suggestion[] = [];
  let lastContextQuery: string | undefined;
  let searchToken = 0;
  let version = 0;
  const listeners = new Set<() => void>();

  const emit = () => {
    version += 1;
    for (const listener of listeners) listener();
  };

  const dispatch = (event: InteractionEvent) => {
    const result = transition(interaction, event, input.draft.state);
    interaction = result.state;
    for (const command of result.commands) apply(command);
    refreshSearch();
    emit();
  };

  const apply = (command: InteractionCommand) => {
    if (command.type === "draft.setText") {
      input.draft.setText(command.value);
      return;
    }
    if (command.type === "mention.add") {
      if (command.item.mention) input.draft.addMention(command.item.mention);
    }
  };

  const refreshSearch = () => {
    if (interaction.popover.type === "context") {
      if (interaction.popover.query !== lastContextQuery) {
        lastContextQuery = interaction.popover.query;
        runSearch(interaction.popover.query);
      }
      return;
    }
    lastContextQuery = undefined;
    files = [];
  };

  const runSearch = (query: string) => {
    const token = ++searchToken;
    input.searchFiles(query).then(
      (results) => {
        if (token !== searchToken) return;
        files = results;
        emit();
      },
      () => {
        if (token !== searchToken) return;
        files = [];
        emit();
      },
    );
  };

  const suggestions = (): Suggestion[] => {
    if (interaction.popover.type === "context") {
      return filterSuggestions([...input.context(), ...files], interaction.popover.query);
    }
    if (
      interaction.popover.type === "command-inline" ||
      interaction.popover.type === "command-menu"
    ) {
      return filterSuggestions(input.commands(), interaction.popover.query);
    }
    return [];
  };

  const select = (item: Suggestion) => {
    if (item.kind === "command") {
      interaction = { ...interaction, popover: { type: "closed" } };
      refreshSearch();
      emit();
      void input.runCommand(item);
      return;
    }
    dispatch({ type: "popover.select", item });
  };

  const value = () => input.draft.state.prompt.map((part) => part.content).join("");

  const canSubmit = () => value().trim().length > 0;

  const openCommands = () => {
    interaction = { ...interaction, popover: { type: "command-menu", query: "" } };
    emit();
  };

  const openContext = () => {
    interaction = { ...interaction, popover: { type: "context", query: "" } };
    lastContextQuery = "";
    emit();
  };

  const reset = () => {
    input.draft.reset();
    interaction = { ...interaction, popover: { type: "closed" } };
    lastContextQuery = undefined;
    files = [];
    emit();
  };

  const setModel = (model: ComposerState["model"]) => {
    input.draft.setModel(model);
    emit();
  };
  const setAgent = (agent: string | undefined) => {
    input.draft.setAgent(agent);
    emit();
  };
  const setVariant = (variant: string | null) => {
    input.draft.setVariant(variant);
    emit();
  };

  return {
    state: () => interaction,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    version: () => version,
    onChangeText: (value, cursor) => dispatch({ type: "input.changed", value, cursor }),
    onCursor: (cursor) => input.draft.setCursor(cursor),
    openCommands,
    openContext,
    closePopover: () => dispatch({ type: "popover.close" }),
    setQuery: (value) => dispatch({ type: "popover.query", value }),
    setActive: (id) => dispatch({ type: "popover.active", id }),
    select,
    suggestions,
    canSubmit,
    submit: () => input.submit(),
    stop: () => input.stop(),
    reset,
    value,
    parts: () => input.draft.state.prompt,
    removeMention: (index) => {
      input.draft.removeMention(index);
      emit();
    },
    setModel,
    setAgent,
    setVariant,
  };
}

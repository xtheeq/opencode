import type { ComposerState, Suggestion } from "@/types/composer";

export type Popover =
  | { type: "closed" }
  | { type: "context"; query: string; activeID?: string }
  | { type: "command-inline"; query: string; activeID?: string }
  | { type: "command-menu"; query: string; activeID?: string };

export type InteractionState = {
  popover: Popover;
};

export type InteractionEvent =
  | { type: "input.changed"; value: string; persist?: boolean }
  | { type: "commands.open" }
  | { type: "context.open" }
  | { type: "popover.query"; value: string }
  | { type: "popover.results"; ids: string[] }
  | { type: "popover.active"; id: string }
  | { type: "popover.close" }
  | { type: "popover.select"; item: Suggestion };

export type InteractionCommand =
  | { type: "draft.setText"; value: string }
  | { type: "mention.add"; item: Suggestion }
  | { type: "popover.filter"; popover: "command" | "context"; query: string };

export type Transition = {
  state: InteractionState;
  commands: InteractionCommand[];
};

export function createInteractionState(): InteractionState {
  return { popover: { type: "closed" } };
}

export function transition(
  state: InteractionState,
  event: InteractionEvent,
  persisted: ComposerState,
): Transition {
  switch (event.type) {
    case "input.changed":
      return inputChanged(state, event);
    case "commands.open":
      return openCommands(state, persisted);
    case "context.open":
      return openContext(state, persisted);
    case "popover.query":
      return queryChanged(state, event.value);
    case "popover.results":
      return resultsChanged(state, event.ids);
    case "popover.active":
      return activeChanged(state, event.id);
    case "popover.close":
      return changed({ ...state, popover: { type: "closed" } });
    case "popover.select":
      return suggestionSelected(state, event.item, persisted);
  }
}

function inputChanged(
  state: InteractionState,
  event: Extract<InteractionEvent, { type: "input.changed" }>,
): Transition {
  const setText: InteractionCommand[] =
    event.persist !== false
      ? [{ type: "draft.setText", value: event.value }]
      : [];
  // End-anchored: the caret position from the native selection event can lag the
  // text-change event, so detect the trigger against the full value instead.
  const context = event.value.match(/(?:^|\s)@([^\s@]*)$/);
  if (context) {
    const query = context[1] ?? "";
    return changed({ ...state, popover: { type: "context", query } }, [
      ...setText,
      { type: "popover.filter", popover: "context", query },
    ]);
  }
  const command = event.value.match(/^\/(\S*)$/);
  if (command) {
    const query = command[1] ?? "";
    return changed({ ...state, popover: { type: "command-inline", query } }, [
      ...setText,
      { type: "popover.filter", popover: "command", query },
    ]);
  }
  return changed(
    {
      ...state,
      popover:
        state.popover.type === "command-menu"
          ? state.popover
          : { type: "closed" },
    },
    setText,
  );
}

function openCommands(
  state: InteractionState,
  persisted: ComposerState,
): Transition {
  if (!populated(persisted)) {
    return changed(
      { ...state, popover: { type: "command-inline", query: "" } },
      [
        { type: "draft.setText", value: promptText(persisted) + "/" },
        { type: "popover.filter", popover: "command", query: "" },
      ],
    );
  }
  return changed({ ...state, popover: { type: "command-menu", query: "" } }, [
    { type: "popover.filter", popover: "command", query: "" },
  ]);
}

function openContext(
  state: InteractionState,
  persisted: ComposerState,
): Transition {
  return changed({ ...state, popover: { type: "context", query: "" } }, [
    { type: "draft.setText", value: promptText(persisted) + "@" },
    { type: "popover.filter", popover: "context", query: "" },
  ]);
}

function queryChanged(state: InteractionState, value: string): Transition {
  if (state.popover.type === "closed") return changed(state);
  const popover = state.popover.type === "context" ? "context" : "command";
  return changed(
    {
      ...state,
      popover: { ...state.popover, query: value, activeID: undefined },
    },
    [{ type: "popover.filter", popover, query: value }],
  );
}

function resultsChanged(state: InteractionState, ids: string[]): Transition {
  if (state.popover.type === "closed") return changed(state);
  const activeID =
    state.popover.activeID && ids.includes(state.popover.activeID)
      ? state.popover.activeID
      : ids[0];
  if (activeID === state.popover.activeID) return changed(state);
  return changed({ ...state, popover: { ...state.popover, activeID } });
}

function activeChanged(state: InteractionState, id: string): Transition {
  if (state.popover.type === "closed" || state.popover.activeID === id)
    return changed(state);
  return changed({ ...state, popover: { ...state.popover, activeID: id } });
}

function suggestionSelected(
  state: InteractionState,
  item: Suggestion,
  persisted: ComposerState,
): Transition {
  const current = promptText(persisted);
  const commands: InteractionCommand[] = [];
  if (item.kind === "command") {
    commands.push({
      type: "draft.setText",
      value:
        state.popover.type === "command-menu"
          ? current.trim()
            ? `${item.label} ${current.trim()}`
            : `${item.label} `
          : replaceTrigger(current, "/", `${item.label} `),
    });
  } else {
    commands.push({ type: "mention.add", item });
  }
  return changed({ ...state, popover: { type: "closed" } }, commands);
}

function promptText(state: ComposerState) {
  return state.prompt
    .map((part) => (part.type === "text" ? part.content : ""))
    .join("");
}

function populated(state: ComposerState) {
  return (
    !!promptText(state).trim() ||
    state.prompt.some((part) => part.type === "file")
  );
}

function replaceTrigger(
  value: string,
  trigger: "@" | "/",
  replacement: string,
) {
  const index =
    trigger === "/" ? value.indexOf(trigger) : value.lastIndexOf(trigger);
  return index < 0 ? replacement : value.slice(0, index) + replacement;
}

function changed(
  state: InteractionState,
  commands: InteractionCommand[] = [],
): Transition {
  return { state, commands };
}

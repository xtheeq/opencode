import type {
  AgentPart,
  ComposerPart,
  ComposerState,
  FilePart,
  ModelSelection,
} from "@/types/composer";

export function setPrompt(
  state: ComposerState,
  prompt: ComposerPart[],
  cursor?: number,
): ComposerState {
  return { ...state, prompt, cursor: cursor ?? state.cursor };
}

export function setCursor(state: ComposerState, cursor: number): ComposerState {
  return { ...state, cursor };
}

export function setText(state: ComposerState, content: string): ComposerState {
  return {
    ...state,
    prompt: withOffsets([
      { type: "text", content, start: 0, end: content.length },
      ...state.prompt.filter((part) => part.type !== "text"),
    ]),
    cursor: content.length,
  };
}

export function addText(state: ComposerState, content: string): ComposerState {
  const cursor = state.cursor ?? partsLength(state.prompt);
  return {
    ...state,
    prompt: insertText(state.prompt, cursor, content),
    cursor: cursor + content.length,
  };
}

export function resetPrompt(state: ComposerState): ComposerState {
  return {
    ...state,
    prompt: [{ type: "text", content: "", start: 0, end: 0 }],
    cursor: 0,
  };
}

export function setModel(
  state: ComposerState,
  model: ModelSelection | undefined,
): ComposerState {
  return { ...state, model };
}

export function setAgent(state: ComposerState, agent: string | undefined): ComposerState {
  return { ...state, agent };
}

export function setVariant(state: ComposerState, variant: string | null): ComposerState {
  return state.model ? { ...state, model: { ...state.model, variant } } : state;
}

export function addMention(state: ComposerState, mention: FilePart | AgentPart): ComposerState {
  const text = partsText(state.prompt);
  const end = state.cursor ?? text.length;
  const start = text.slice(0, end).lastIndexOf("@");
  return {
    ...state,
    prompt: insertMention(state.prompt, start < 0 ? end : start, end, mention),
    cursor: (start < 0 ? end : start) + mention.content.length + 1,
  };
}

export function removeMention(state: ComposerState, index: number): ComposerState {
  if (index < 0 || index >= state.prompt.length) return state;
  const prompt = state.prompt.filter((_, i) => i !== index);
  return {
    ...state,
    prompt: withOffsets(prompt),
    cursor: Math.min(state.cursor ?? 0, partsLength(prompt)),
  };
}

function partsText(prompt: ComposerPart[]): string {
  return prompt.map((part) => part.content).join("");
}

function partsLength(prompt: ComposerPart[]): number {
  return prompt.reduce((length, part) => length + part.content.length, 0);
}

function insertText(prompt: ComposerPart[], cursor: number, content: string): ComposerPart[] {
  let position = 0;
  let inserted = false;
  const parts = prompt.flatMap<ComposerPart>((part) => {
    const start = position;
    position += part.content.length;
    if (inserted) return [part];
    if (part.type === "text" && cursor >= start && cursor <= position) {
      inserted = true;
      const offset = cursor - start;
      return [{ ...part, content: part.content.slice(0, offset) + content + part.content.slice(offset) }];
    }
    if (cursor > start) return [part];
    inserted = true;
    return [{ type: "text", content, start: 0, end: 0 }, part];
  });
  if (!inserted) parts.push({ type: "text", content, start: 0, end: 0 });
  return withOffsets(parts);
}

function insertMention(
  prompt: ComposerPart[],
  start: number,
  end: number,
  mention: FilePart | AgentPart,
): ComposerPart[] {
  let position = 0;
  const parts = prompt.flatMap<ComposerPart>((part) => {
    const partStart = position;
    position += part.content.length;
    if (part.type !== "text" || start < partStart || end > position) return [part];
    const before = part.content.slice(0, start - partStart);
    const after = part.content.slice(end - partStart);
    return [
      ...(before ? [{ type: "text" as const, content: before, start: 0, end: 0 }] : []),
      mention,
      { type: "text" as const, content: ` ${after}`, start: 0, end: 0 },
    ];
  });
  return withOffsets(parts);
}

function withOffsets(prompt: ComposerPart[]): ComposerPart[] {
  let offset = 0;
  return prompt.map((part) => {
    const next = { ...part, start: offset, end: offset + part.content.length };
    offset = next.end;
    return next;
  });
}

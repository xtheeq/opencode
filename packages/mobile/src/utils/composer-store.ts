import type {
  AgentPart,
  ComposerPart,
  ComposerState,
  FilePart,
  ModelSelection,
} from "@/types/composer";

export type ComposerStoreAccess = {
  get(): ComposerState;
  set(next: ComposerState | ((current: ComposerState) => ComposerState)): void;
};

export function createComposerStore(access: ComposerStoreAccess) {
  const update = (fn: (state: ComposerState) => ComposerState) => access.set(fn);
  return {
    get state() {
      return access.get();
    },
    setPrompt(prompt: ComposerPart[], cursor?: number) {
      update((state) => ({ ...state, prompt, cursor: cursor ?? state.cursor }));
    },
    setCursor(cursor: number) {
      update((state) => ({ ...state, cursor }));
    },
    setText(content: string) {
      update((state) => ({
        ...state,
        prompt: withOffsets([
          { type: "text", content, start: 0, end: content.length },
          ...state.prompt.filter((part) => part.type !== "text"),
        ]),
        cursor: content.length,
      }));
    },
    addText(content: string) {
      update((state) => {
        const cursor = state.cursor ?? promptLength(state.prompt);
        const prompt = insertText(state.prompt, cursor, content);
        return { ...state, prompt, cursor: cursor + content.length };
      });
    },
    reset() {
      update((state) => ({
        ...state,
        prompt: [{ type: "text", content: "", start: 0, end: 0 }],
        cursor: 0,
      }));
    },
    setModel(model: ModelSelection | undefined) {
      update((state) => ({ ...state, model }));
    },
    setAgent(agent: string | undefined) {
      update((state) => ({ ...state, agent }));
    },
    setVariant(variant: string | null) {
      update((state) => (state.model ? { ...state, model: { ...state.model, variant } } : state));
    },
    addMention(mention: FilePart | AgentPart) {
      update((state) => {
        const text = promptText(state.prompt);
        const end = state.cursor ?? text.length;
        const start = text.slice(0, end).lastIndexOf("@");
        const prompt = insertMention(state.prompt, start < 0 ? end : start, end, mention);
        return {
          ...state,
          prompt,
          cursor: (start < 0 ? end : start) + mention.content.length + 1,
        };
      });
    },
    removeMention(index: number) {
      update((state) => {
        if (index < 0 || index >= state.prompt.length) return state;
        const prompt = state.prompt.filter((_, i) => i !== index);
        return {
          ...state,
          prompt: withOffsets(prompt),
          cursor: Math.min(state.cursor ?? 0, promptText(prompt).length),
        };
      });
    },
  };
}

export type ComposerStore = ReturnType<typeof createComposerStore>;

function promptText(prompt: ComposerPart[]) {
  return prompt.map((part) => part.content).join("");
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

function promptLength(prompt: ComposerPart[]) {
  return prompt.reduce((length, part) => length + part.content.length, 0);
}

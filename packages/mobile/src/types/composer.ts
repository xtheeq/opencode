export type ComposerPartBase = {
  content: string;
  start: number;
  end: number;
};

export type TextPart = ComposerPartBase & {
  type: "text";
};

export type FilePart = ComposerPartBase & {
  type: "file";
  path: string;
  mime?: string;
  filename?: string;
  url?: string;
};

export type AgentPart = ComposerPartBase & {
  type: "agent";
  name: string;
};

export type ComposerPart = TextPart | FilePart | AgentPart;

export type ModelSelection = {
  providerID: string;
  modelID: string;
  variant?: string | null;
};

export type ComposerState = {
  prompt: ComposerPart[];
  cursor?: number;
  model?: ModelSelection;
  agent?: string;
};

export type SuggestionKind = "agent" | "command" | "file" | "reference" | "resource";

export type Suggestion = {
  id: string;
  kind: SuggestionKind;
  label: string;
  title?: string;
  trigger?: string;
  description?: string;
  path?: string;
  mention?: FilePart | AgentPart;
};

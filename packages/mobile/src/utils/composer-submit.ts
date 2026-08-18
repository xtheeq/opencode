import type {
  LocationRef,
  ModelRef,
  SessionPromptInput,
} from "@opencode-ai/client/promise";
import type {
  AgentPart,
  ComposerPart,
  ComposerState,
  FilePart,
  ModelSelection,
} from "@/types/composer";
import { eventStore } from "@/stores/store";

export type ComposerApi = {
  create(input: {
    agent?: string;
    model?: ModelRef;
    location: LocationRef;
  }): Promise<{ id: string }>;
  switchAgent(input: { sessionID: string; agent: string }): Promise<unknown>;
  switchModel(input: { sessionID: string; model: ModelRef }): Promise<unknown>;
  prompt(input: SessionPromptInput): Promise<unknown>;
};

export type ComposerSubmitInput = {
  state: ComposerState;
  session?: { id: string; agent?: string; model?: ModelRef };
  api: ComposerApi;
  delivery?: "steer" | "queue";
};

export function buildPromptRequest(prompt: ComposerPart[]) {
  const text = prompt.map((part) => part.content).join("");
  const files = prompt
    .filter((part): part is FilePart => part.type === "file")
    .map((part) => ({
      uri: part.url ?? `file://${part.path}`,
      name: part.filename,
      mention: { start: part.start, end: part.end, text: part.content },
    }));
  const agents = prompt
    .filter((part): part is AgentPart => part.type === "agent")
    .map((part) => ({
      name: part.name,
      mention: { start: part.start, end: part.end, text: part.content },
    }));
  return { text, files, agents };
}

export async function submitComposer(
  input: ComposerSubmitInput,
): Promise<{ sessionID: string }> {
  const request = buildPromptRequest(input.state.prompt);
  if (!request.text.trim()) throw new Error("Nothing to submit");

  const { agent, model } = input.state;
  const existing = input.session;
  const sessionID =
    existing?.id ??
    (await createSession(
      input.api,
      agent,
      model,
      eventStore.getState()._defaultLocation,
    ));
  if (existing) {
    await syncSelection(input.api, sessionID, existing, agent, model);
  }
  await input.api.prompt({
    sessionID,
    text: request.text,
    files: request.files,
    agents: request.agents,
    delivery: input.delivery ?? "steer",
  });
  return { sessionID };
}

async function createSession(
  api: ComposerApi,
  agent: string | undefined,
  model: ModelSelection | undefined,
  location: LocationRef,
): Promise<string> {
  const session = await api.create({
    agent,
    model: model ? toModelRef(model) : undefined,
    location,
  });
  return session.id;
}

async function syncSelection(
  api: ComposerApi,
  sessionID: string,
  session: NonNullable<ComposerSubmitInput["session"]>,
  agent: string | undefined,
  model: ModelSelection | undefined,
): Promise<void> {
  if (agent && session.agent !== agent) {
    await api.switchAgent({ sessionID, agent });
  }
  if (model && sessionModelDiffers(session.model, model)) {
    await api.switchModel({ sessionID, model: toModelRef(model) });
  }
}

function sessionModelDiffers(
  current: ModelRef | undefined,
  selected: ModelSelection,
): boolean {
  if (!current) return true;
  return (
    current.providerID !== selected.providerID ||
    current.id !== selected.modelID ||
    (current.variant ?? "default") !== (selected.variant ?? "default")
  );
}

function toModelRef(model: ModelSelection): ModelRef {
  return {
    id: model.modelID,
    providerID: model.providerID,
    variant: model.variant ?? undefined,
  };
}

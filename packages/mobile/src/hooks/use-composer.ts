import { useShallow } from "zustand/react/shallow";
import type { LocationRef } from "@opencode-ai/client/promise";
import type { Suggestion } from "@/types/composer";
import {
  composerDispatch,
  composerOpenCommands,
  composerRemoveMention,
  composerReset,
  composerSelect,
  composerSetCursor,
  composerSetModel,
  composerSubmit,
  useComposerDraft,
  useComposerFiles,
  useComposerInteraction,
} from "@/stores/composer";
import {
  eventStore,
  getClient,
  locationKey,
  locationQuery,
  type LocationData,
} from "@/stores/store";
import {
  commandSuggestions,
  contextSuggestions,
  searchContextFiles,
  sheetSuggestions,
} from "@/utils/composer-suggestions";
import {
  modelDisplayName,
  modelSections,
  resolveCurrentModel,
} from "@/utils/composer-pickers";
import type { ModelSelection } from "@/types/composer";
import {
  useActiveLocation,
  useSessionActive,
  useSessionInfo,
} from "./use-store";

const EMPTY_LOCATION: LocationData = {};

export type ComposerLocation = "session" | "new";

export function isNewSessionKey(sessionID: string): boolean {
  return sessionID === "new";
}

/** Resolve the catalog location: the session's own location for a real
 * session, otherwise the selected project's default location. */
export function composerLocation(
  sessionID: string,
  sessionInfo: { location?: LocationRef } | undefined,
  defaultLocation: LocationRef,
): LocationRef {
  if (isNewSessionKey(sessionID)) return defaultLocation;
  return sessionInfo?.location ?? defaultLocation;
}

async function searchFiles(
  query: string,
  location: LocationRef,
): Promise<Suggestion[]> {
  if (!query.trim()) return [];
  return searchContextFiles(query, {
    find: async (q) => {
      const data = await getClient().file.find({
        location: locationQuery(location),
        query: q,
        type: "file",
        limit: 20,
      });
      return data.data;
    },
  });
}

export function useComposer(sessionID: string) {
  const draft = useComposerDraft(sessionID);
  const interaction = useComposerInteraction(sessionID);
  const files = useComposerFiles(sessionID);
  const sessionInfo = useSessionInfo(sessionID);
  const defaultLocation = useActiveLocation();
  const resolvedLocation = composerLocation(
    sessionID,
    sessionInfo,
    defaultLocation,
  );
  const location = eventStore(
    useShallow(
      (state) =>
        state.location[locationKey(resolvedLocation)] ?? EMPTY_LOCATION,
    ),
  );
  const working = useSessionActive(sessionID) === "running";
  const text = draft.prompt.map((part) => part.content).join("");
  const parts = draft.prompt;
  const canSubmit = text.trim().length > 0;

  const models = location.model ?? [];
  const providers = location.provider ?? [];
  const primaryAgentModel = location.agent?.find(
    (agent) => agent.mode === "primary",
  )?.model;
  const model = resolveCurrentModel(
    draft.model,
    sessionInfo?.model,
    primaryAgentModel,
  );
  const modelName = model ? modelDisplayName(models, model) : undefined;
  const sections = modelSections(models, providers);

  const suggestions = sheetSuggestions(interaction, {
    commands: commandSuggestions(location.command ?? []),
    context: contextSuggestions({
      references: location.reference ?? [],
      agents: location.agent ?? [],
      resources: location.mcp?.resource ?? [],
    }),
    files,
  });

  const searchAt = (query: string) => searchFiles(query, resolvedLocation);

  const submit = async () => {
    const info = eventStore.getState().session.info[sessionID];
    return composerSubmit(sessionID, {
      state: draft,
      session: info
        ? { id: info.id, agent: info.agent, model: info.model }
        : undefined,
      api: getClient().session,
    });
  };

  const stop = async () => {
    if (sessionID && !isNewSessionKey(sessionID))
      await getClient().session.interrupt({ sessionID });
  };

  const runCommand = async (item: Suggestion) => {
    if (!sessionID || isNewSessionKey(sessionID)) return;
    await getClient()
      .session.command({ sessionID, command: item.trigger ?? item.title ?? "" })
      .then(() => composerReset(sessionID))
      .catch((error) => console.error("Failed to run command", error));
  };

  return {
    text,
    parts,
    canSubmit,
    working,
    interaction,
    suggestions,
    model,
    modelName,
    sections,
    setModel: (next: ModelSelection | undefined) =>
      composerSetModel(sessionID, next),
    onChangeText: (value: string) =>
      composerDispatch(sessionID, { type: "input.changed", value }, searchAt),
    onCursor: (cursor: number) => composerSetCursor(sessionID, cursor),
    openCommands: () => composerOpenCommands(sessionID),
    select: (item: Suggestion) =>
      composerSelect(sessionID, item, { runCommand, searchFiles: searchAt }),
    submit,
    stop,
    removeMention: (index: number) => composerRemoveMention(sessionID, index),
  };
}

import { useShallow } from "zustand/react/shallow";
import type { Suggestion } from "@/types/composer";
import {
  commandSuggestions,
  searchContextFiles,
  sheetSuggestions,
} from "@/utils/composer-suggestions";
import {
  composerDispatch,
  composerOpenCommands,
  composerRemoveMention,
  composerReset,
  composerSelect,
  composerSetCursor,
  composerSubmit,
  useComposerDraft,
  useComposerInteraction,
} from "@/stores/composer";
import { eventStore, getClient, locationKey, locationQuery, type LocationData } from "@/stores/store";
import { useSessionActive } from "./use-store";

const EMPTY_LOCATION: LocationData = {};

async function searchFiles(query: string): Promise<Suggestion[]> {
  if (!query.trim()) return [];
  return searchContextFiles(query, {
    find: async (q) => {
      const data = await getClient().file.find({
        location: locationQuery(eventStore.getState()._defaultLocation),
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
  const location = eventStore(
    useShallow((state) => state.location[locationKey(state._defaultLocation)] ?? EMPTY_LOCATION),
  );
  const working = useSessionActive(sessionID) === "running";
  const text = draft.prompt.map((part) => part.content).join("");
  const parts = draft.prompt;
  const canSubmit = text.trim().length > 0;

  const commands = commandSuggestions(location.command ?? []);
  const suggestions = sheetSuggestions(interaction, { commands, context: [], files: [] });

  const submit = async () => {
    const info = eventStore.getState().session.info[sessionID];
    await composerSubmit(sessionID, {
      state: draft,
      session: info ? { id: info.id, agent: info.agent, model: info.model } : undefined,
      api: getClient().session,
    });
  };

  const stop = async () => {
    if (sessionID) await getClient().session.interrupt({ sessionID });
  };

  const runCommand = async (item: Suggestion) => {
    if (!sessionID) return;
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
    onChangeText: (value: string) =>
      composerDispatch(sessionID, { type: "input.changed", value }, searchFiles),
    onCursor: (cursor: number) => composerSetCursor(sessionID, cursor),
    openCommands: () => composerOpenCommands(sessionID),
    select: (item: Suggestion) => composerSelect(sessionID, item, { runCommand, searchFiles }),
    submit,
    stop,
    removeMention: (index: number) => composerRemoveMention(sessionID, index),
  };
}

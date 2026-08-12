import type { Suggestion } from "@/types/composer";
import { searchContextFiles } from "@/utils/composer-suggestions";
import {
  composerDispatch,
  composerRemoveMention,
  composerSetCursor,
  composerSubmit,
  useComposerDraft,
} from "@/stores/composer";
import { eventStore, getClient, locationQuery } from "@/stores/store";
import { useSessionActive } from "./use-store";

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
  const working = useSessionActive(sessionID) === "running";
  const text = draft.prompt.map((part) => part.content).join("");
  const parts = draft.prompt;
  const canSubmit = text.trim().length > 0;

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

  return {
    text,
    parts,
    canSubmit,
    working,
    onChangeText: (value: string) =>
      composerDispatch(sessionID, { type: "input.changed", value }, searchFiles),
    onCursor: (cursor: number) => composerSetCursor(sessionID, cursor),
    submit,
    stop,
    removeMention: (index: number) => composerRemoveMention(sessionID, index),
  };
}

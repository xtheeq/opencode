import { useState, useSyncExternalStore } from "react";
import type { Suggestion } from "@/types/composer";
import { createComposerController, type ComposerController } from "@/utils/composer-controller";
import { createComposerStore } from "@/utils/composer-store";
import { commandSuggestions, contextSuggestions, searchContextFiles } from "@/utils/composer-suggestions";
import { submitComposer } from "@/utils/composer-submit";
import { composerAccess, useComposerDraft } from "@/stores/composer";
import { eventStore, getClient, locationKey, locationQuery, type LocationData } from "@/stores/store";
import { useSessionActive } from "./use-store";

const EMPTY_LOCATION: LocationData = {};

function readLocation(): LocationData {
  return (
    eventStore.getState().location[locationKey(eventStore.getState()._defaultLocation)] ??
    EMPTY_LOCATION
  );
}

function createController(sessionID: string): ComposerController {
  const draft = createComposerStore(composerAccess(sessionID));
  return createComposerController({
    draft,
    context: () =>
      contextSuggestions({
        references: readLocation().reference ?? [],
        agents: readLocation().agent ?? [],
        resources: readLocation().mcp?.resource ?? [],
      }),
    commands: () => commandSuggestions(readLocation().command ?? []),
    searchFiles: async (query: string): Promise<Suggestion[]> => {
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
    },
    runCommand: async (item: Suggestion) => {
      if (!sessionID) return;
      await getClient()
        .session.command({ sessionID, command: item.trigger ?? item.title ?? "" })
        .catch((error) => console.error("Failed to run command", error));
    },
    submit: async () => {
      const info = eventStore.getState().session.info[sessionID];
      return submitComposer({
        state: draft.state,
        session: info ? { id: info.id, agent: info.agent, model: info.model } : undefined,
        api: getClient().session,
      });
    },
    stop: async () => {
      if (sessionID) await getClient().session.interrupt({ sessionID });
    },
  });
}

export function useComposer(sessionID: string) {
  const [controller, setController] = useState(() => createController(sessionID));
  const [previousSession, setPreviousSession] = useState(sessionID);
  if (previousSession !== sessionID) {
    setPreviousSession(sessionID);
    setController(createController(sessionID));
  }
  useSyncExternalStore(controller.subscribe, controller.version);
  const draft = useComposerDraft(sessionID);
  const working = useSessionActive(sessionID) === "running";
  const text = draft.prompt.map((part) => part.content).join("");
  const parts = draft.prompt;
  const canSubmit = text.trim().length > 0;
  return { controller, working, text, parts, canSubmit };
}

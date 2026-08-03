import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { eventStore, pickBlocker, selectBlockers } from "@/stores/store";
import { syncBlockers } from "@/stores/sync";

export function useSessionBlockers(sessionID: string) {
  const state = eventStore(
    useShallow((s) => ({
      session: s.session,
      loaded: s._loadedBlockers[sessionID] ?? false,
      loading: s._loadingBlockers[sessionID] ?? false,
    })),
  );

  const blockers = selectBlockers({ session: state.session }, sessionID);

  useEffect(() => {
    if (!state.loaded) void syncBlockers(sessionID);
  }, [sessionID, state.loaded]);

  return {
    blockers,
    blocker: pickBlocker(blockers),
    blocked: blockers.length > 0,
    loaded: state.loaded,
    loading: state.loading,
  };
}

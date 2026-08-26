import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { eventStore, pickBlocker, selectBlockers } from "@/stores/store";
import { hydrateSession } from "@/stores/sync";

export function useSessionBlockers(sessionID: string) {
  const state = eventStore(
    useShallow((s) => ({
      session: s.session,
      hydration: s._hydration[sessionID],
    })),
  );

  const blockers = selectBlockers({ session: state.session }, sessionID);

  useEffect(() => {
    if (state.hydration !== "loaded") void hydrateSession(sessionID);
  }, [sessionID, state.hydration]);

  return {
    blockers,
    blocker: pickBlocker(blockers),
    blocked: blockers.length > 0,
    loaded: state.hydration === "loaded",
    loading: state.hydration === "loading",
  };
}

export function useSessionBlocked(sessionID: string) {
  return eventStore(
    (s) => selectBlockers({ session: s.session }, sessionID).length > 0,
  );
}

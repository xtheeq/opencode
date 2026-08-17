import { useCallback, useState } from "react";
import { eventStore, getClient } from "@/stores/store";

export function useCreateSession() {
  const [isCreating, setIsCreating] = useState(false);

  const createSession = useCallback(async () => {
    setIsCreating(true);
    try {
      return await getClient().session.create({
        location: eventStore.getState()._defaultLocation,
      });
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { createSession, isCreating };
}

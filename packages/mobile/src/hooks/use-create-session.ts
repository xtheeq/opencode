import { useCallback, useState } from "react";
import { getClient } from "@/services/api";

export function useCreateSession() {
  const [isCreating, setIsCreating] = useState(false);

  const createSession = useCallback(async () => {
    setIsCreating(true);
    try {
      return await getClient().session.create();
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { createSession, isCreating };
}

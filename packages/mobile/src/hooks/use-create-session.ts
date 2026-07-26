import { useCallback, useState } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { SessionListOutput } from "@opencode-ai/client/promise";
import { getClient } from "@/services/api";

export function useCreateSession() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const createSession = useCallback(async () => {
    setIsCreating(true);
    try {
      const session = await getClient().session.create();
      queryClient.setQueryData<InfiniteData<SessionListOutput>>(
        ["sessions"],
        (prev) => {
          if (!prev || !prev.pages.length) return prev;
          const [firstPage, ...rest] = prev.pages;
          return {
            ...prev,
            pages: [
              { ...firstPage, data: [session, ...(firstPage.data ?? [])] },
              ...rest,
            ],
          };
        },
      );
      return session;
    } finally {
      setIsCreating(false);
    }
  }, [queryClient]);

  return { createSession, isCreating };
}

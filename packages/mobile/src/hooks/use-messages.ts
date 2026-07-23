import { useInfiniteQuery } from "@tanstack/react-query";
import { getClient } from "@/services/api";

export function useMessages(sessionID: string) {
  return useInfiniteQuery({
    queryKey: ["messages", sessionID],
    queryFn: async ({ pageParam }) => {
      const result = await getClient().message.list({
        sessionID,
        limit: 50,
        order: pageParam ? undefined : "desc",
        cursor: pageParam,
      });
      return result;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor.next ?? undefined,
  });
}

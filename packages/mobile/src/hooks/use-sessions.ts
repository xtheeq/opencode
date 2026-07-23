import { useInfiniteQuery } from "@tanstack/react-query";
import { getClient } from "@/services/api";

export function useSessions() {
  return useInfiniteQuery({
    queryKey: ["sessions"],
    queryFn: async ({ pageParam }) => {
      const result = await getClient().session.list({
        parentID: null,
        cursor: pageParam,
      });
      return result;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor.next ?? undefined,
  });
}

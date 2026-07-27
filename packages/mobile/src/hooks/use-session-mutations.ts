import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { SessionInfo, SessionListOutput } from "@opencode-ai/client/promise";
import { getClient } from "@/services/api";

export function useSessionMutations() {
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (input: { sessionID: string }) =>
      getClient().session.remove(input),
    onSuccess: (_data, input) => {
      queryClient.removeQueries({ queryKey: ["messages", input.sessionID] });
      queryClient.removeQueries({ queryKey: ["session", input.sessionID] });
      queryClient.setQueryData<InfiniteData<SessionListOutput>>(["sessions"], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pages: prev.pages.map((p) => ({
            ...p,
            data: p.data.filter((s) => s.id !== input.sessionID),
          })),
        };
      });
    },
  });

  const fork = useMutation({
    mutationFn: (input: { sessionID: string; messageID?: string }) =>
      getClient().session.fork(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const rename = useMutation({
    mutationFn: (input: { sessionID: string; title: string }) =>
      getClient().session.rename(input),
    onSuccess: (_data, input) => {
      queryClient.setQueryData<SessionInfo>(["session", input.sessionID], (prev) =>
        prev ? { ...prev, title: input.title } : prev,
      );
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const move = useMutation({
    mutationFn: (input: {
      sessionID: string;
      directory: string;
      workspaceID?: string;
    }) => getClient().session.move(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const switchAgent = useMutation({
    mutationFn: (input: { sessionID: string; agent: string }) =>
      getClient().session.switchAgent(input),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({ queryKey: ["session", input.sessionID] }),
  });

  const switchModel = useMutation({
    mutationFn: (input: {
      sessionID: string;
      model: { id: string; providerID: string; variant?: string };
    }) => getClient().session.switchModel(input),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({ queryKey: ["session", input.sessionID] }),
  });

  const compact = useMutation({
    mutationFn: (input: { sessionID: string }) =>
      getClient().session.compact(input),
  });

  const interrupt = useMutation({
    mutationFn: (input: { sessionID: string }) =>
      getClient().session.interrupt(input),
  });

  return {
    remove,
    fork,
    rename,
    move,
    switchAgent,
    switchModel,
    compact,
    interrupt,
  };
}

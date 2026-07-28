import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { V2Event } from "@opencode-ai/client/promise";
import { getEventManager } from "@/services/event-manager";
import {
  applyStepStarted,
  applyTextStarted,
  applyTextDelta,
  applyTextEnded,
  applyReasoningStarted,
  applyReasoningDelta,
  applyReasoningEnded,
  applyToolInputStarted,
  applyToolInputDelta,
  applyToolInputEnded,
  applyToolCalled,
  applyToolProgress,
  applyToolSuccess,
  applyToolFailed,
  applyStepEnded,
  applyStepFailed,
  applyExecutionFailed,
  applyExecutionSucceeded,
  applyExecutionInterrupted,
  applyRetryScheduled,
  applyInputAdmitted,
  applyInputPromoted,
  applyShellStarted,
  applyShellEnded,
  applyCompactionStarted,
  applyCompactionDelta,
  applyCompactionEnded,
  applyCompactionFailed,
  applySynthetic,
  applyInstructionsUpdated,
  applyAgentSelected,
  applyModelSelected,
} from "./stream-mutations";

type MessagePage = {
  data: import("@opencode-ai/client/promise").SessionMessageInfo[];
  cursor: { previous?: string; next?: string };
};

export function useSessionStream(sessionID: string) {
  const queryClient = useQueryClient();
  const pendingRef = useRef<V2Event[]>([]);

  useEffect(() => {
    pendingRef.current = [];

    const unsub = getEventManager().onAny((event) => {
      if (!("sessionID" in event.data) || event.data.sessionID !== sessionID)
        return;

      queryClient.setQueryData(
        ["messages", sessionID],
        (prev: InfiniteData<MessagePage> | undefined) => {
          if (!prev) {
            pendingRef.current.push(event);
            return undefined;
          }
          let result = prev;
          for (const pending of pendingRef.current) {
            result = applyEvent(result, pending)!;
          }
          pendingRef.current = [];
          return applyEvent(result, event)!;
        },
      );
    });

    return () => {
      unsub();
      pendingRef.current = [];
    };
  }, [sessionID, queryClient]);

  const data = queryClient.getQueryData<InfiniteData<MessagePage>>([
    "messages",
    sessionID,
  ]);
  const fetchedRef = useRef(false);
  if (data && !fetchedRef.current) {
    fetchedRef.current = true;
    const pending = pendingRef.current;
    pendingRef.current = [];
    if (pending.length > 0) {
      queryClient.setQueryData(
        ["messages", sessionID],
        (prev: InfiniteData<MessagePage> | undefined) => {
          if (!prev) return prev;
          let result = prev;
          for (const ev of pending) result = applyEvent(result, ev)!;
          return result;
        },
      );
    }
  }
}

function applyEvent(
  prev: InfiniteData<MessagePage> | undefined,
  event: V2Event,
) {
  if (!prev) return prev;

  switch (event.type) {
    case "session.step.started":
      return applyStepStarted(
        prev,
        event.data.assistantMessageID,
        event.data.agent,
        event.data.model,
        event.created,
      );
    case "session.text.started":
      return applyTextStarted(
        prev,
        event.data.assistantMessageID,
        event.data.ordinal,
      );
    case "session.text.delta":
      return applyTextDelta(
        prev,
        event.data.assistantMessageID,
        event.data.ordinal,
        event.data.delta,
      );
    case "session.text.ended":
      return applyTextEnded(
        prev,
        event.data.assistantMessageID,
        event.data.ordinal,
        event.data.text,
      );
    case "session.reasoning.started":
      return applyReasoningStarted(
        prev,
        event.data.assistantMessageID,
        event.data.ordinal,
      );
    case "session.reasoning.delta":
      return applyReasoningDelta(
        prev,
        event.data.assistantMessageID,
        event.data.ordinal,
        event.data.delta,
      );
    case "session.reasoning.ended":
      return applyReasoningEnded(
        prev,
        event.data.assistantMessageID,
        event.data.ordinal,
        event.data.text,
      );
    case "session.tool.input.started":
      return applyToolInputStarted(
        prev,
        event.data.assistantMessageID,
        event.data.callID,
        event.data.name,
      );
    case "session.tool.input.delta":
      return applyToolInputDelta(
        prev,
        event.data.assistantMessageID,
        event.data.callID,
        event.data.delta,
      );
    case "session.tool.input.ended":
      return applyToolInputEnded(
        prev,
        event.data.assistantMessageID,
        event.data.callID,
        event.data.text,
      );
    case "session.tool.called":
      return applyToolCalled(
        prev,
        event.data.assistantMessageID,
        event.data.callID,
        event.data.input,
        event.data.executed,
      );
    case "session.tool.progress":
      return applyToolProgress(
        prev,
        event.data.assistantMessageID,
        event.data.callID,
        event.data.metadata,
      );
    case "session.tool.success":
      return applyToolSuccess(
        prev,
        event.data.assistantMessageID,
        event.data.callID,
        event.data.content,
        event.data.metadata,
      );
    case "session.tool.failed":
      return applyToolFailed(
        prev,
        event.data.assistantMessageID,
        event.data.callID,
        event.data.error,
        event.data.content,
        event.data.metadata,
      );
    case "session.step.ended":
      return applyStepEnded(
        prev,
        event.data.assistantMessageID,
        event.data.finish,
        event.data.cost,
        event.data.tokens,
      );
    case "session.step.failed":
      return applyStepFailed(
        prev,
        event.data.assistantMessageID,
        event.data.error.type,
        event.data.error.message,
      );
    case "session.execution.failed":
      return applyExecutionFailed(
        prev,
        event.data.error.type,
        event.data.error.message,
      );
    case "session.execution.succeeded":
      return applyExecutionSucceeded(prev);
    case "session.execution.interrupted":
      return applyExecutionInterrupted(prev);
    case "session.retry.scheduled":
      return applyRetryScheduled(
        prev,
        event.data.assistantMessageID,
        event.data.attempt,
        event.data.error.type,
        event.data.error.message,
      );
    case "session.input.admitted":
      return applyInputAdmitted(
        prev,
        event.data.inputID,
        event.data.input.data.text,
      );
    case "session.input.promoted":
      return applyInputPromoted(prev, event.data.inputID, event.created);
    case "session.shell.started":
      return applyShellStarted(
        prev,
        event.id,
        event.data.shell,
        event.created,
        event.metadata,
      );
    case "session.shell.ended":
      return applyShellEnded(
        prev,
        event.data.shell.id,
        event.data.shell.status as "running" | "exited" | "timeout" | "killed",
        event.data.shell.exit,
        event.data.output,
        event.created,
      );
    case "session.compaction.started":
      return applyCompactionStarted(
        prev,
        event.data.inputID ?? event.id,
        event.data.reason,
        event.data.recent,
        event.created,
      );
    case "session.compaction.delta":
      return applyCompactionDelta(prev, event.data.text);
    case "session.compaction.ended":
      return applyCompactionEnded(
        prev,
        event.id,
        event.data.reason,
        event.data.text,
        event.data.recent,
        event.created,
      );
    case "session.compaction.failed":
      return applyCompactionFailed(
        prev,
        event.id,
        event.data.reason,
        event.data.error,
        event.data.inputID,
        event.metadata,
        event.created,
      );
    case "session.synthetic":
      return applySynthetic(
        prev,
        event.id,
        event.data.text,
        event.data.description,
        event.data.metadata,
        event.created,
      );
    case "session.instructions.updated": {
      const instructionsMeta = event.metadata?.instructions;
      const isInitial =
        typeof instructionsMeta === "object" &&
        instructionsMeta !== null &&
        "initial" in instructionsMeta &&
        instructionsMeta.initial === true;
      if (isInitial) return prev;
      return applyInstructionsUpdated(
        prev,
        event.id,
        Object.keys(event.data.delta),
        event.metadata,
        event.created,
      );
    }
    case "session.agent.selected":
      return applyAgentSelected(
        prev,
        event.id,
        event.data.agent,
        event.created,
      );
    case "session.model.selected":
      return applyModelSelected(
        prev,
        event.id,
        event.data.model,
        event.created,
      );
    default:
      return prev;
  }
}

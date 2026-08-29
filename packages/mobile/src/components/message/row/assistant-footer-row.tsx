import { Text } from "@/components/primitives";
import type { SessionMessageAssistant } from "@opencode-ai/client/promise";

function formatDuration(created: number, completed?: number) {
  if (!completed) return undefined;
  const seconds = Math.round((completed - created) / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function isInterrupted(error: SessionMessageAssistant["error"]): boolean {
  const type = error?.type.toLowerCase();
  return !!type && (type.includes("abort") || type.includes("interrupt"));
}

export function AssistantFooterRow({
  message,
}: {
  message: SessionMessageAssistant;
}) {
  const duration = formatDuration(message.time.created, message.time.completed);
  const interrupted = isInterrupted(message.error);

  return (
    <>
      {message.error && !interrupted && (
        <Text variant="caption" color="error">
          Error: {message.error.message}
        </Text>
      )}
      <Text variant="caption" color="secondary">
        {message.agent} · {message.model.id}
        {message.model.variant ? ` (${message.model.variant})` : ""} ·{" "}
        {message.model.providerID}
        {duration ? ` · ${duration}` : ""}
        {interrupted ? " · interrupted" : ""}
      </Text>
    </>
  );
}

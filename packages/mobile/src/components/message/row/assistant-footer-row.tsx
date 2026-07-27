import { Text } from "@/components/primitives";
import type { SessionMessageAssistant } from "@opencode-ai/client/promise";

function formatDuration(created: number, completed?: number) {
  if (!completed) return undefined;
  const seconds = Math.round((completed - created) / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function AssistantFooterRow({
  message,
}: {
  message: SessionMessageAssistant;
}) {
  const duration = formatDuration(message.time.created, message.time.completed);

  return (
    <Text variant="caption" color="textSecondary">
      {message.agent} · {message.model.id}
      {message.model.variant ? ` (${message.model.variant})` : ""} ·{" "}
      {message.model.providerID}
      {duration ? ` · ${duration}` : ""}
      {message.error ? ` · ${message.error.type}` : ""}
    </Text>
  );
}

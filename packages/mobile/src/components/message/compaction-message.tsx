import type { SessionMessageCompaction } from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";

export function CompactionMessage({
  message,
}: {
  message: SessionMessageCompaction;
}) {
  switch (message.status) {
    case "running":
      return (
        <>
          <Text variant="caption">{message.summary}</Text>
          <Text variant="caption">{message.recent}</Text>
        </>
      );
    case "completed":
      return (
        <>
          <Text variant="caption">{message.summary}</Text>
          <Text variant="caption">{message.recent}</Text>
        </>
      );
    case "failed":
      return (
        <Text variant="caption">
          {message.error.type}: {message.error.message}
        </Text>
      );
  }
  const exhaustive: never = message;
  return exhaustive;
}

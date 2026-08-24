import type {
  SessionMessageSystem,
  SessionMessageSynthetic,
} from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";

type Systemish = SessionMessageSystem | SessionMessageSynthetic;

export function SystemMessage({ message }: { message: Systemish }) {
  const line =
    message.description?.trim() ||
    message.text.trim() ||
    (message.type === "system" ? "Instructions updated" : "");

  if (!line) return null;

  return (
    <Text variant="caption" color="secondary">
      {line}
    </Text>
  );
}

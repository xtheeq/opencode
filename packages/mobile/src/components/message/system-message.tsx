import type {
  SessionMessageSystem,
  SessionMessageSynthetic,
} from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";

type Systemish = SessionMessageSystem | SessionMessageSynthetic;

export function SystemMessage({ message }: { message: Systemish }) {
  return (
    <Text variant="caption" color="textSecondary">
      {message.type === "synthetic" && message.description
        ? `${message.description}\n${message.text}`
        : message.text}
    </Text>
  );
}

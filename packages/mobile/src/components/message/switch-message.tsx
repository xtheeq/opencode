import type {
  SessionMessageAgentSelected,
  SessionMessageModelSelected,
} from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";

type SwitchMessage = SessionMessageAgentSelected | SessionMessageModelSelected;

export function SwitchMessage({ message }: { message: SwitchMessage }) {
  switch (message.type) {
    case "agent-switched":
      return (
        <Text variant="caption" color="secondary">
          Switched agent to {message.agent}
        </Text>
      );
    case "model-switched": {
      const modelLabel = message.model.variant
        ? `${message.model.id} (${message.model.variant})`
        : message.model.id;
      const fromLabel = message.previous
        ? message.previous.variant
          ? `${message.previous.id} (${message.previous.variant})`
          : message.previous.id
        : undefined;

      const label = fromLabel
        ? `Switched model from ${fromLabel} to ${modelLabel}`
        : `Switched model to ${modelLabel}`;

      return (
        <Text variant="caption" color="secondary">
          {label}
        </Text>
      );
    }
  }
  const exhaustive: never = message;
  return exhaustive;
}

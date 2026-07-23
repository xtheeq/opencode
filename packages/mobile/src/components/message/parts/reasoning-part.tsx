import type { SessionMessageAssistantReasoning } from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";

export function ReasoningPart({
  part,
}: {
  part: SessionMessageAssistantReasoning;
}) {
  return <Text variant="caption">{part.text}</Text>;
}

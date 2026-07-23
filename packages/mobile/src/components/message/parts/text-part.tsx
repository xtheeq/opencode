import type { SessionMessageAssistantText } from "@opencode-ai/client/promise"
import { Text } from "@/components/primitives"

export function TextPart({ part }: { part: SessionMessageAssistantText }) {
  return <Text>{part.text}</Text>
}

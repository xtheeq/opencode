import type { SessionMessageSkill } from "@opencode-ai/client/promise"
import { Text } from "@/components/primitives"

export function SkillMessage({ message }: { message: SessionMessageSkill }) {
  return (
    <>
      <Text variant="caption">{message.name}: {message.text}</Text>
    </>
  )
}

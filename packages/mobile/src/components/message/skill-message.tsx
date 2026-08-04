import type { SessionMessageSkill } from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";

export function SkillMessage({ message }: { message: SessionMessageSkill }) {
  return (
    <Text variant="caption" color="secondary">
      {message.name}: {message.text}
    </Text>
  );
}

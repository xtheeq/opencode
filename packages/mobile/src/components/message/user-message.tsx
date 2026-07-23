import type { SessionMessageUser } from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";

export function UserMessage({ message }: { message: SessionMessageUser }) {
  return (
    <>
      <Text>{message.text}</Text>
      {message.agents?.map((agent, i) => (
        <Text key={i} variant="caption">
          @{agent.name}
        </Text>
      ))}
      {message.files?.map((file, i) => (
        <Text key={i} variant="caption">
          {file.name ?? file.mime}
        </Text>
      ))}
    </>
  );
}

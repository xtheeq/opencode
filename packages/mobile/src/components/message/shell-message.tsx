import type { SessionMessageShell } from "@opencode-ai/client/promise"
import { Text } from "@/components/primitives"

function statusLabel(message: SessionMessageShell) {
  switch (message.status) {
    case "running": return "Running"
    case "exited": return message.exit !== undefined ? `Exited (${message.exit})` : "Exited"
    case "timeout": return "Timed out"
    case "killed": return "Killed"
  }
  const exhaustive: never = message.status
  return exhaustive
}

export function ShellMessage({ message }: { message: SessionMessageShell }) {
  return (
    <>
      <Text variant="caption">{message.command}</Text>
      {message.output && (
        <Text variant="caption" numberOfLines={5}>{message.output.output}{message.output.truncated ? " … (truncated)" : ""}</Text>
      )}
      <Text variant="caption">{statusLabel(message)}</Text>
    </>
  )
}

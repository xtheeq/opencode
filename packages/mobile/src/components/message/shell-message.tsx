import type { SessionMessageShell } from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";
import { stripAnsi } from "@/utils/tool-state";

function statusLabel(message: SessionMessageShell) {
  switch (message.status) {
    case "running":
      return "Running";
    case "exited":
      return message.exit !== undefined ? `Exited (${message.exit})` : "Exited";
    case "timeout":
      return "Timed out";
    case "killed":
      return "Killed";
  }
  const exhaustive: never = message.status;
  return exhaustive;
}

export function ShellMessage({ message }: { message: SessionMessageShell }) {
  return (
    <>
      <Text variant="mono">$ {message.command}</Text>
      {message.output && (
        <Text variant="mono" color="secondary" numberOfLines={5} selectable>
          {stripAnsi(message.output.output)}
          {message.output.truncated ? " … (truncated)" : ""}
        </Text>
      )}
      <Text variant="caption" color="secondary">
        {statusLabel(message)}
      </Text>
    </>
  );
}
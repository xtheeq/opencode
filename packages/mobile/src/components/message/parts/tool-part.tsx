import type { SessionMessageAssistantTool } from "@opencode-ai/client/promise";
import { Text } from "@/components/primitives";

function toolLabel(part: SessionMessageAssistantTool) {
  const { state } = part;
  switch (state.status) {
    case "streaming":
      return `${part.name} ${state.input}`;
    case "running":
    case "completed":
    case "error":
      return part.name;
  }
  const exhaustive: never = state;
  return exhaustive;
}

function ToolContent({ part }: { part: SessionMessageAssistantTool }) {
  const { state } = part;
  if (state.status === "streaming") return null;
  if (state.content.length === 0 && Object.keys(state.structured).length === 0)
    return null;
  return (
    <>
      {state.content.map((item, i) => {
        switch (item.type) {
          case "text":
            return (
              <Text key={i} variant="caption">
                {item.text}
              </Text>
            );
          case "file":
            return (
              <Text key={i} variant="caption">
                {item.name ?? item.mime}: {item.uri}
              </Text>
            );
        }
        const exhaustive: never = item;
        return exhaustive;
      })}
      {Object.keys(state.structured).length > 0 && (
        <Text variant="caption">{JSON.stringify(state.structured)}</Text>
      )}
      {"result" in state && state.result !== undefined && (
        <Text variant="caption">Result: {JSON.stringify(state.result)}</Text>
      )}
    </>
  );
}

export function ToolPart({ part }: { part: SessionMessageAssistantTool }) {
  return (
    <>
      {part.executed === false && <Text variant="caption">(skipped)</Text>}
      <Text variant="caption">{toolLabel(part)}</Text>
      <ToolContent part={part} />
      {part.state.status === "error" && (
        <Text variant="caption">{part.state.error.message}</Text>
      )}
    </>
  );
}

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
  switch (state.status) {
    case "streaming":
      return null;
    case "running":
      if (Object.keys(state.metadata).length === 0) return null;
      return <Text variant="caption">{JSON.stringify(state.metadata)}</Text>;
    case "completed":
      return (
        <>
          {state.content.map((item, i) =>
            item.type === "text" ? (
              <Text key={i} variant="caption">
                {item.text}
              </Text>
            ) : (
              <Text key={i} variant="caption">
                {item.name ?? item.mime}: {item.uri}
              </Text>
            ),
          )}
          {state.metadata && Object.keys(state.metadata).length > 0 && (
            <Text variant="caption">{JSON.stringify(state.metadata)}</Text>
          )}
        </>
      );
    case "error":
      return (
        <>
          {state.content?.map((item, i) =>
            item.type === "text" ? (
              <Text key={i} variant="caption">
                {item.text}
              </Text>
            ) : (
              <Text key={i} variant="caption">
                {item.name ?? item.mime}: {item.uri}
              </Text>
            ),
          )}
          {state.metadata && Object.keys(state.metadata).length > 0 && (
            <Text variant="caption">{JSON.stringify(state.metadata)}</Text>
          )}
        </>
      );
  }
  const exhaustive: never = state;
  return exhaustive;
}

export function GenericTool({ part }: { part: SessionMessageAssistantTool }) {
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

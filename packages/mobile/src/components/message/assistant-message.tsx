import type {
  SessionMessageAssistant,
  SessionMessageAssistantText,
  SessionMessageAssistantReasoning,
  SessionMessageAssistantTool,
} from "@opencode-ai/client/promise"
import { Text } from "@/components/primitives"
import { TextPart, ReasoningPart, ToolPart } from "./parts"

function formatDuration(created: number, completed?: number) {
  if (!completed) return undefined
  const seconds = Math.round((completed - created) / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export function AssistantMessage({ message }: { message: SessionMessageAssistant }) {
  const duration = formatDuration(message.time.created, message.time.completed)

  return (
    <>
      <Text variant="caption">
        {message.agent} · {message.model.id}{message.model.variant ? ` (${message.model.variant})` : ""} · {message.model.providerID}
      </Text>
      {message.content.map((part, i) => (
        <Part key={i} part={part} />
      ))}
      {message.snapshot?.files && message.snapshot.files.length > 0 && (
        <Text variant="caption">{message.snapshot.files.join(", ")}</Text>
      )}
      {message.error && (
        <Text variant="caption">{message.error.type}: {message.error.message}</Text>
      )}
      {message.retry && (
        <Text variant="caption">{message.retry.attempt}: {message.retry.error.message}</Text>
      )}
      {message.cost !== undefined && (
        <Text variant="caption">Cost: ${message.cost.toFixed(6)}</Text>
      )}
      {message.tokens && (
        <Text variant="caption">
          in: {message.tokens.input} out: {message.tokens.output} reasoning: {message.tokens.reasoning}
          {message.tokens.cache.read > 0 || message.tokens.cache.write > 0
            ? ` cache: ${message.tokens.cache.read}/${message.tokens.cache.write}` : ""}
        </Text>
      )}
      {duration && (
        <Text variant="caption">{duration}</Text>
      )}
      {message.finish && (
        <Text variant="caption">{message.finish}</Text>
      )}
    </>
  )
}

function Part({ part }: {
  part: SessionMessageAssistantText | SessionMessageAssistantReasoning | SessionMessageAssistantTool
}) {
  switch (part.type) {
    case "text": return <TextPart part={part} />
    case "reasoning": return <ReasoningPart part={part} />
    case "tool": return <ToolPart part={part} />
  }
  const exhaustive: never = part
  return exhaustive
}

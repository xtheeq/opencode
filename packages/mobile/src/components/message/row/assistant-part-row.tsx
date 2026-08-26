import type { SessionMessageAssistant } from "@opencode-ai/client/promise";
import { BubbleContainer } from "../bubble-container";
import { TextPart, ReasoningPart, ToolPart } from "../parts";

type ContentPart = SessionMessageAssistant["content"][number];

export function AssistantPartRow({ part }: { part: ContentPart }) {
  return (
    <BubbleContainer alignment="flex-start" fullWidth>
      {part.type === "text" && <TextPart part={part} />}
      {part.type === "reasoning" && <ReasoningPart part={part} />}
      {part.type === "tool" && <ToolPart part={part} />}
    </BubbleContainer>
  );
}

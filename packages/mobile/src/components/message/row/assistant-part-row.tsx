import { BubbleContainer } from "../bubble-container";
import { TextPart, ReasoningPart, ToolPart } from "../parts";
import { useSessionPart } from "@/hooks/use-row-content";

export function AssistantPartRow({
  sessionID,
  messageID,
  partID,
}: {
  sessionID: string;
  messageID: string;
  partID: string;
}) {
  const part = useSessionPart(sessionID, messageID, partID);
  if (!part) return null;
  return (
    <BubbleContainer alignment="flex-start" fullWidth>
      {part.type === "text" && <TextPart part={part} />}
      {part.type === "reasoning" && <ReasoningPart part={part} />}
      {part.type === "tool" && <ToolPart part={part} />}
    </BubbleContainer>
  );
}

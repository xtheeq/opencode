import type { SessionMessageAssistantTool } from "@opencode-ai/client/promise";
import { BubbleContainer } from "../bubble-container";
import { ToolPart } from "../parts";

export function ExplorationGroupRow({
  parts,
}: {
  parts: SessionMessageAssistantTool[];
}) {
  if (parts.length === 0) return null;

  return (
    <BubbleContainer alignment="flex-start">
      {parts.map((part) => (
        <ToolPart key={part.id} part={part} />
      ))}
    </BubbleContainer>
  );
}

import type { SessionMessageAssistant } from "@opencode-ai/client/promise";
import { BubbleContainer } from "../bubble-container";
import { ToolPart } from "../parts";
import { resolvePart } from "@/hooks/project-rows";
import type { PartRef } from "@/types/rows";

export function ExplorationGroupRow({
  message,
  refs,
}: {
  message: SessionMessageAssistant;
  refs: PartRef[];
  pending: string[];
  completed: boolean;
}) {
  const toolParts = refs
    .map((ref) => {
      const part = resolvePart(message, ref.partID);
      return part?.type === "tool" ? part : undefined;
    })
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  if (toolParts.length === 0) return null;

  return (
    <BubbleContainer alignment="flex-start">
      {toolParts.map((part) => (
        <ToolPart key={part.id} part={part} />
      ))}
    </BubbleContainer>
  );
}

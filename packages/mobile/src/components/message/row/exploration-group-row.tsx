import { BubbleContainer } from "../bubble-container";
import { ToolPart } from "../parts";
import type { PartRef, ToolPart as ToolPartContent } from "@/types/rows";
import { useSessionParts } from "@/hooks/use-row-content";

export function ExplorationGroupRow({
  sessionID,
  parts,
}: {
  sessionID: string;
  parts: PartRef[];
}) {
  const resolved = useSessionParts(sessionID, parts);
  const tools = resolved.filter(
    (part): part is ToolPartContent => part.type === "tool",
  );
  if (tools.length === 0) return null;

  return (
    <BubbleContainer alignment="flex-start" fullWidth>
      {tools.map((part) => (
        <ToolPart key={part.id} part={part} />
      ))}
    </BubbleContainer>
  );
}

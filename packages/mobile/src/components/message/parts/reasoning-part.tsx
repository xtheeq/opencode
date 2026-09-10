import type { SessionMessageAssistantReasoning } from "@opencode/client/promise";
import { typography } from "@/theme";
import { MarkdownPart } from "@/components/markdown";

export function ReasoningPart({
  part,
}: {
  part: SessionMessageAssistantReasoning;
}) {
  return (
    <MarkdownPart text={part.text} baseFontSize={typography.caption.fontSize} />
  );
}

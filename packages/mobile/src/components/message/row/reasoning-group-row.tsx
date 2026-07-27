import type { SessionMessageAssistant } from "@opencode-ai/client/promise";
import { BubbleContainer } from "../bubble-container";
import { MarkdownPart } from "@/components/markdown";
import { typography } from "@/theme";
import { resolvePart } from "@/hooks/project-rows";
import type { PartRef } from "@/types/rows";

export function ReasoningGroupRow({
  message,
  refs,
}: {
  message: SessionMessageAssistant;
  refs: PartRef[];
  completed: boolean;
}) {
  const parts = refs
    .map((ref) => resolvePart(message, ref.partID))
    .filter(
      (
        p,
      ): p is SessionMessageAssistant["content"][number] & {
        type: "reasoning";
        text: string;
      } => p?.type === "reasoning",
    );
  const text = parts.map((p) => p.text).join("\n");

  if (!text) return null;

  return (
    <BubbleContainer alignment="flex-start">
      <MarkdownPart text={text} baseFontSize={typography.body.fontSize} />
    </BubbleContainer>
  );
}

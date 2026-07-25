import type { SessionMessageAssistantText } from "@opencode-ai/client/promise";
import { typography } from "@/theme";
import { MarkdownPart } from "@/components/markdown";

export function TextPart({ part }: { part: SessionMessageAssistantText }) {
  return (
    <MarkdownPart text={part.text} baseFontSize={typography.body.fontSize} />
  );
}

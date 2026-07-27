import type { SessionMessageCompaction } from "@opencode-ai/client/promise";
import { BubbleContainer } from "../bubble-container";
import { CompactionMessage } from "../compaction-message";

export function CompactionMessageRow({
  message,
}: {
  message: SessionMessageCompaction;
}) {
  return (
    <BubbleContainer alignment="center">
      <CompactionMessage message={message} />
    </BubbleContainer>
  );
}

import { BubbleContainer } from "../bubble-container";
import { CompactionMessage } from "../compaction-message";
import { useSessionMessage } from "@/hooks/use-row-content";

export function CompactionMessageRow({
  sessionID,
  messageID,
}: {
  sessionID: string;
  messageID: string;
}) {
  const message = useSessionMessage(sessionID, messageID);
  if (message?.type !== "compaction") return null;
  return (
    <BubbleContainer alignment="center">
      <CompactionMessage message={message} />
    </BubbleContainer>
  );
}

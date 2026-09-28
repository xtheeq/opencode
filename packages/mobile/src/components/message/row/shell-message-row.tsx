import { BubbleContainer } from "../bubble-container";
import { ShellMessage } from "../shell-message";
import { useSessionMessage } from "@/hooks/use-row-content";

export function ShellMessageRow({
  sessionID,
  messageID,
}: {
  sessionID: string;
  messageID: string;
}) {
  const message = useSessionMessage(sessionID, messageID);
  if (message?.type !== "shell") return null;
  return (
    <BubbleContainer alignment="flex-start" fullWidth>
      <ShellMessage message={message} />
    </BubbleContainer>
  );
}

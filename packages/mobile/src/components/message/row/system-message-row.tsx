import { BubbleContainer } from "../bubble-container";
import { SystemMessage } from "../system-message";
import { SwitchMessage } from "../switch-message";
import { SkillMessage } from "../skill-message";
import { useSessionMessage } from "@/hooks/use-row-content";

export function SystemMessageRow({
  sessionID,
  messageID,
}: {
  sessionID: string;
  messageID: string;
}) {
  const message = useSessionMessage(sessionID, messageID);
  if (!message) return null;

  return (
    <BubbleContainer alignment="center">
      {message.type === "system" || message.type === "synthetic" ? (
        <SystemMessage message={message} />
      ) : message.type === "agent-switched" ||
        message.type === "model-switched" ||
        message.type === "location-switched" ? (
        <SwitchMessage message={message} />
      ) : message.type === "skill" ? (
        <SkillMessage message={message} />
      ) : null}
    </BubbleContainer>
  );
}

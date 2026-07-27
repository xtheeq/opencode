import type { SessionMessageInfo } from "@opencode-ai/client/promise";
import { BubbleContainer } from "../bubble-container";
import { SystemMessage } from "../system-message";
import { SwitchMessage } from "../switch-message";
import { SkillMessage } from "../skill-message";

export function SystemMessageRow({ message }: { message: SessionMessageInfo }) {
  const content = () => {
    switch (message.type) {
      case "system":
      case "synthetic":
        return <SystemMessage message={message} />;
      case "agent-switched":
      case "model-switched":
        return <SwitchMessage message={message} />;
      case "skill":
        return <SkillMessage message={message} />;
      default:
        return null;
    }
  };

  return <BubbleContainer alignment="center">{content()}</BubbleContainer>;
}

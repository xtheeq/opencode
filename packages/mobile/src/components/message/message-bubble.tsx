import type { SessionMessageInfo } from "@opencode-ai/client/promise";
import { UserMessage } from "./user-message";
import { AssistantMessage } from "./assistant-message";
import { SystemMessage } from "./system-message";
import { ShellMessage } from "./shell-message";
import { CompactionMessage } from "./compaction-message";
import { SwitchMessage } from "./switch-message";
import { SkillMessage } from "./skill-message";

export function MessageBubble({ message }: { message: SessionMessageInfo }) {
  switch (message.type) {
    case "user":
      return <UserMessage message={message} />;
    case "assistant":
      return <AssistantMessage message={message} />;
    case "system":
    case "synthetic":
      return <SystemMessage message={message} />;
    case "shell":
      return <ShellMessage message={message} />;
    case "compaction":
      return <CompactionMessage message={message} />;
    case "agent-switched":
    case "model-switched":
      return <SwitchMessage message={message} />;
    case "skill":
      return <SkillMessage message={message} />;
  }
  const exhaustive: never = message;
  return exhaustive;
}

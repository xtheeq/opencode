import type { SessionMessageShell } from "@opencode-ai/client/promise";
import { BubbleContainer } from "../bubble-container";
import { ShellMessage } from "../shell-message";

export function ShellMessageRow({ message }: { message: SessionMessageShell }) {
  return (
    <BubbleContainer alignment="flex-start">
      <ShellMessage message={message} />
    </BubbleContainer>
  );
}

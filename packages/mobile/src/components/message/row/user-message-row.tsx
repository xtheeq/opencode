import type { SessionMessageUser } from "@opencode-ai/client/promise";
import { BubbleContainer } from "../bubble-container";
import { UserMessage } from "../user-message";
import { spacing, borderRadius as br, useTheme } from "@/theme";

export function UserMessageRow({ message }: { message: SessionMessageUser }) {
  const { colors } = useTheme();
  return (
    <BubbleContainer
      alignment="flex-end"
      style={{
        maxWidth: "85%",
        padding: spacing.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: br.lg,
        borderBottomRightRadius: br.sm,
      }}
    >
      <UserMessage message={message} />
    </BubbleContainer>
  );
}

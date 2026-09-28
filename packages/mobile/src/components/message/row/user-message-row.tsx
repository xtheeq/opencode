import { BubbleContainer } from "../bubble-container";
import { UserMessage } from "../user-message";
import { spacing, borderRadius as br, useTheme } from "@/theme";
import { useSessionMessage } from "@/hooks/use-row-content";

export function UserMessageRow({
  sessionID,
  messageID,
}: {
  sessionID: string;
  messageID: string;
}) {
  const { colors } = useTheme();
  const message = useSessionMessage(sessionID, messageID);
  if (message?.type !== "user") return null;
  return (
    <BubbleContainer
      alignment="flex-end"
      style={{
        maxWidth: "85%",
        padding: spacing.sm,
        backgroundColor: colors.background.surface,
        borderWidth: 1,
        borderColor: colors.border.default,
        borderRadius: br.lg,
        borderBottomRightRadius: br.sm,
      }}
    >
      <UserMessage message={message} />
    </BubbleContainer>
  );
}

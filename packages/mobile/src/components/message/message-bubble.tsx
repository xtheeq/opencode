import { View, StyleSheet } from "react-native"
import type { ReactNode } from "react"
import type { SessionMessageInfo } from "@opencode-ai/client/promise"
import { spacing, borderRadius as br, useTheme } from "@/theme"
import { UserMessage } from "./user-message"
import { AssistantMessage } from "./assistant-message"
import { SystemMessage } from "./system-message"
import { ShellMessage } from "./shell-message"
import { CompactionMessage } from "./compaction-message"
import { SwitchMessage } from "./switch-message"
import { SkillMessage } from "./skill-message"

function BubbleContainer({
  message,
  children,
}: {
  message: SessionMessageInfo
  children: ReactNode
}) {
  const { colors } = useTheme()
  const alignment = getAlignment(message.type)
  return (
    <View style={[styles.row, { justifyContent: alignment }]}>
      <View style={computeBubble(message.type, colors)}>{children}</View>
    </View>
  )
}

function getAlignment(type: SessionMessageInfo["type"]) {
  switch (type) {
    case "user":
      return "flex-end" as const
    case "assistant":
    case "shell":
      return "flex-start" as const
    default:
      return "center" as const
  }
}

function computeBubble(
  type: SessionMessageInfo["type"],
  colors: ReturnType<typeof useTheme>["colors"],
) {
  switch (type) {
    case "user":
      return {
        maxWidth: "85%" as const,
        padding: spacing.sm,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: br.lg,
        borderBottomRightRadius: br.sm,
      }
    case "assistant":
    case "shell":
      return {
        maxWidth: "100%" as const,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
      }
    default:
      return {
        maxWidth: "100%" as const,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
      }
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
})

export function MessageBubble({ message }: { message: SessionMessageInfo }) {
  switch (message.type) {
    case "user":
      return (
        <BubbleContainer message={message}>
          <UserMessage message={message} />
        </BubbleContainer>
      )
    case "assistant":
      return (
        <BubbleContainer message={message}>
          <AssistantMessage message={message} />
        </BubbleContainer>
      )
    case "system":
    case "synthetic":
      return (
        <BubbleContainer message={message}>
          <SystemMessage message={message} />
        </BubbleContainer>
      )
    case "shell":
      return (
        <BubbleContainer message={message}>
          <ShellMessage message={message} />
        </BubbleContainer>
      )
    case "compaction":
      return (
        <BubbleContainer message={message}>
          <CompactionMessage message={message} />
        </BubbleContainer>
      )
    case "agent-switched":
    case "model-switched":
      return (
        <BubbleContainer message={message}>
          <SwitchMessage message={message} />
        </BubbleContainer>
      )
    case "skill":
      return (
        <BubbleContainer message={message}>
          <SkillMessage message={message} />
        </BubbleContainer>
      )
  }
  const exhaustive: never = message
  return exhaustive
}

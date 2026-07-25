import { View, StyleSheet, ActivityIndicator } from "react-native"
import type { SessionMessageCompaction } from "@opencode-ai/client/promise"
import { Text } from "@/components/primitives"
import { spacing, useTheme } from "@/theme"

export function CompactionMessage({
  message,
}: {
  message: SessionMessageCompaction
}) {
  const { colors } = useTheme()

  switch (message.status) {
    case "running": {
      const label = message.summary ?? "Compacting..."
      return (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <Text variant="caption" color="textSecondary" style={styles.label}>
            {label}
          </Text>
        </View>
      )
    }
    case "completed":
      return (
        <>
          <Text variant="caption" color="textSecondary" style={styles.summary}>
            {message.summary ?? "Compact"}
          </Text>
          {message.recent && (
            <Text variant="caption" color="textSecondary">
              {message.recent}
            </Text>
          )}
        </>
      )
    case "failed":
      return (
        <Text variant="caption" color="error">
          {message.error.type}: {message.error.message}
        </Text>
      )
  }
  const exhaustive: never = message
  return exhaustive
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginLeft: spacing.xs,
  },
  summary: {
    textAlign: "center",
  },
})

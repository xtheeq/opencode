import { View, StyleSheet, ActivityIndicator } from "react-native";
import type { SessionMessageCompaction } from "@opencode-ai/client/promise";
import { MarkdownPart } from "@/components/markdown";
import { Text } from "@/components/primitives";
import { spacing, typography, useTheme } from "@/theme";

export function CompactionMessage({
  message,
}: {
  message: SessionMessageCompaction;
}) {
  const { colors } = useTheme();

  switch (message.status) {
    case "running":
      return (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={colors.text.secondary} />
          <Text variant="caption" color="secondary" style={styles.label}>
            {message.summary || "Compacting..."}
          </Text>
        </View>
      );
    case "completed":
      return (
        <>
          {message.summary.trim() && (
            <MarkdownPart
              text={message.summary}
              baseFontSize={typography.caption.fontSize}
            />
          )}
          {message.recent && (
            <Text variant="caption" color="secondary">
              {message.recent}
            </Text>
          )}
        </>
      );
    case "failed":
      if (message.error.type === "aborted") {
        return (
          <Text variant="caption" color="secondary">
            Compaction cancelled
          </Text>
        );
      }
      return (
        <Text variant="caption" color="error">
          {message.error.message}
        </Text>
      );
  }
  const exhaustive: never = message;
  return exhaustive;
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
});

import { StyleSheet, View } from "react-native";
import { borderRadius, spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import type { SessionInfo } from "@opencode-ai/client/promise";

function formatTime(ms: number) {
  const date = new Date(ms);
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatCost(cost: number) {
  if (cost === 0) return "";
  return `$${cost.toFixed(6)}`;
}

export function SessionCard({ session }: { session: SessionInfo }) {
  const { colors } = useTheme();

  const formattedCost = formatCost(session.cost);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text variant="body" numberOfLines={1} style={styles.title}>
          {session.title || "Untitled"}
        </Text>
        <Text variant="caption" color="textSecondary">
          {formatTime(session.time.created)}
        </Text>
      </View>
      <View style={styles.meta}>
        {session.agent && (
          <Text variant="caption" color="textSecondary">
            {session.agent}
          </Text>
        )}
        {session.model && (
          <Text variant="caption" color="textSecondary">
            {session.model.id}
          </Text>
        )}
        {formattedCost && (
          <Text variant="caption" color="textSecondary">
            {formattedCost}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    flex: 1,
    marginRight: spacing.sm,
  },
  meta: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});

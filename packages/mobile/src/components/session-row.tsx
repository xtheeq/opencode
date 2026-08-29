import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import { spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import { useSessionActive } from "@/hooks/use-store";
import { useSessionBlocked } from "@/hooks/use-blockers";
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

export function SessionRow({
  session,
  onPress,
}: {
  session: SessionInfo;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const active = useSessionActive(session.id);
  const blocked = useSessionBlocked(session.id);
  const title = session.title || "Untitled";

  const status = blocked
    ? "needs attention"
    : active === "running"
      ? "running"
      : undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={status ? `${title} (${status})` : title}
      style={styles.row}
    >
      <Text
        variant="body"
        numberOfLines={1}
        style={[styles.title, styles.flex]}
      >
        {title}
      </Text>
      {blocked ? (
        <CircleAlert size={16} color={colors.status.warning} />
      ) : active === "running" ? (
        <ActivityIndicator size="small" color={colors.text.accent} />
      ) : (
        <Text variant="caption" color="secondary">
          {formatTime(session.time.updated)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  title: {
    fontWeight: "500",
  },
  flex: {
    flex: 1,
  },
});

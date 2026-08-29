import { StyleSheet, TouchableOpacity, View } from "react-native";
import { borderRadius, spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import type { Project } from "@opencode-ai/client/promise";
import { projectDisplayName } from "@/utils/project";

export function ProjectRow({
  project,
  onPress,
}: {
  project: Project;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const name = projectDisplayName(project);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={[
        styles.row,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
      ]}
    >
      <View style={styles.rowBody}>
        <Text variant="body" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {project.canonical}
        </Text>
      </View>
      {project.vcs ? (
        <View
          style={[
            styles.vcsBadge,
            {
              borderColor: colors.border.subtle,
              backgroundColor: colors.background.subtle,
            },
          ]}
        >
          <Text variant="caption" color="secondary">
            {project.vcs}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  vcsBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
});

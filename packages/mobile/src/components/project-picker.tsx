import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import CircleCheck from "lucide-react-native/icons/circle-check";
import { Button, Text } from "@/components/primitives";
import { borderRadius, spacing, useTheme } from "@/theme";
import type { Project } from "@opencode-ai/client/promise";
import { isProjectActive, projectDisplayName } from "@/utils/project";

export function ProjectPicker({
  projects,
  loaded,
  activeDirectory,
  onSelect,
  onUseDefault,
  refreshing,
  onRefresh,
}: {
  projects: Project[];
  loaded: boolean;
  activeDirectory?: string;
  onSelect: (directory: string) => void;
  onUseDefault?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const { colors } = useTheme();

  if (!loaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.text.primary} />
      </View>
    );
  }

  if (projects.length === 0) {
    return (
      <View style={styles.centered}>
        <Text variant="body" color="secondary" style={styles.emptyText}>
          No projects found
        </Text>
        {onUseDefault ? (
          <Button title="Use server default location" onPress={onUseDefault} />
        ) : null}
      </View>
    );
  }

  return (
    <FlatList
      data={projects}
      keyExtractor={(project) => project.id}
      contentContainerStyle={styles.list}
      refreshing={refreshing ?? false}
      onRefresh={onRefresh}
      renderItem={({ item }) => (
        <ProjectRow
          project={item}
          active={isProjectActive(item, activeDirectory)}
          onPress={() => onSelect(item.canonical)}
        />
      )}
    />
  );
}

function ProjectRow({
  project,
  active,
  onPress,
}: {
  project: Project;
  active: boolean;
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
      accessibilityState={{ selected: active }}
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
      {active ? <CircleCheck size={18} color={colors.action.primary} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyText: {
    textAlign: "center",
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
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

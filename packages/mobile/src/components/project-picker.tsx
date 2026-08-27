import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Text } from "@/components/primitives";
import { borderRadius, spacing, useTheme } from "@/theme";
import type { Project } from "@opencode-ai/client/promise";
import { projectDisplayName } from "@/utils/project";

export function ProjectPicker({
  projects,
  loaded,
  onSelect,
  onUseDefault,
  refreshing,
  onRefresh,
  query,
}: {
  projects: Project[];
  loaded: boolean;
  onSelect: (directory: string) => void;
  onUseDefault?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  query?: string;
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
          {query ? "No projects match" : "No projects found"}
        </Text>
        {!query && onUseDefault ? (
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
      keyboardShouldPersistTaps="handled"
      refreshing={refreshing ?? false}
      onRefresh={onRefresh}
      renderItem={({ item }) => (
        <ProjectRow project={item} onPress={() => onSelect(item.canonical)} />
      )}
    />
  );
}

function ProjectRow({
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

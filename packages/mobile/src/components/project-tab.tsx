import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { Button, Text } from "@/components/primitives";
import { spacing, useTheme } from "@/theme";
import type { Project } from "@opencode-ai/client/promise";
import { projectDisplayName } from "@/utils/project";
import { ProjectRow } from "@/components/project-row";

export function ProjectTab({
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
});

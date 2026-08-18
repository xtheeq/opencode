import { useState } from "react";
import Plus from "lucide-react-native/icons/plus";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import type { DrawerContentComponentProps } from "expo-router/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { borderRadius, spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import { SessionCard } from "@/components/session-card";
import { ProjectPicker } from "@/components/project-picker";
import {
  useProjects,
  useProjectsLoaded,
  useSessions,
  useSessionsLoaded,
  useActiveLocation,
} from "@/hooks/use-store";
import { useCreateSession } from "@/hooks/use-create-session";
import { selectProject } from "@/stores/project";
import { syncProjectList, syncSessionList } from "@/stores/sync";
import {
  findActiveProject,
  pathBasename,
  projectDisplayName,
  sessionsForProject,
} from "@/utils/project";

export function SessionList({ navigation }: DrawerContentComponentProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { createSession, isCreating } = useCreateSession();
  const sessions = useSessions();
  const loaded = useSessionsLoaded();
  const projects = useProjects();
  const projectsLoaded = useProjectsLoaded();
  const activeLocation = useActiveLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [view, setView] = useState<"sessions" | "projects">("sessions");

  const activeProject = findActiveProject(projects, activeLocation.directory);
  const projectLabel = activeLocation.directory
    ? activeProject
      ? projectDisplayName(activeProject)
      : pathBasename(activeLocation.directory)
    : "Choose a project";

  const visibleSessions = activeProject
    ? sessionsForProject(sessions, activeProject.id)
    : [];

  function openSession(id: string) {
    router.push({ pathname: "/session/[id]", params: { id } });
    navigation.closeDrawer();
  }

  async function handleNewSession() {
    try {
      const session = await createSession();
      openSession(session.id);
    } catch (error) {
      console.error("Failed to create session", error);
    }
  }

  async function handleProjectSelect(directory: string) {
    setView("sessions");
    await selectProject(directory).catch(() => undefined);
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await Promise.all([syncSessionList(), syncProjectList()]);
    } catch {}
    setIsRefreshing(false);
  }

  if (!loaded || !projectsLoaded) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background.default },
        ]}
      >
        <ActivityIndicator size="large" color={colors.text.primary} />
      </View>
    );
  }

  if (view === "projects") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.default }]}>
        <TouchableOpacity
          onPress={() => setView("sessions")}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Back to sessions"
          style={[styles.backRow, { borderBottomColor: colors.border.subtle }]}
        >
          <ChevronLeft size={20} color={colors.icon.default} />
          <Text variant="label">Choose project</Text>
        </TouchableOpacity>
        <ProjectPicker
          projects={projects}
          loaded={projectsLoaded}
          onSelect={handleProjectSelect}
          onRefresh={() => void syncProjectList()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default }]}>
      <FlatList
        data={visibleSessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionCard session={item} onPress={() => openSession(item.id)} />
        )}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <>
            <TouchableOpacity
              onPress={() => setView("projects")}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="Choose project"
              style={[
                styles.projectRow,
                { borderColor: colors.border.default },
              ]}
            >
              <Text variant="body" numberOfLines={1} style={styles.projectName}>
                {projectLabel}
              </Text>
              <View style={styles.projectMeta}>
                {activeProject?.vcs ? (
                  <Text variant="caption" color="secondary">
                    {activeProject.vcs}
                  </Text>
                ) : null}
                <ChevronDown size={16} color={colors.icon.muted} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNewSession}
              disabled={isCreating}
              style={[
                styles.newSession,
                {
                  borderColor: colors.border.default,
                  opacity: isCreating || !activeProject ? 0.6 : 1,
                },
              ]}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <View style={styles.newSessionRow}>
                  <Plus size={18} color={colors.icon.default} />
                  <Text variant="body">New session</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            {activeProject ? (
              <Text color="secondary">No sessions in this project yet</Text>
            ) : (
              <Text color="secondary">Choose a project to start</Text>
            )}
          </View>
        }
        contentContainerStyle={[
          {
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + spacing.sm,
            flexGrow: 1,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  projectName: {
    flex: 1,
  },
  projectMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  newSession: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    alignItems: "center",
  },
  newSessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

import { useState } from "react";
import Plus from "lucide-react-native/icons/plus";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import FolderOpen from "lucide-react-native/icons/folder-open";
import Search from "lucide-react-native/icons/search";
import X from "lucide-react-native/icons/x";
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { router } from "expo-router";
import type { SessionInfo } from "@opencode-ai/client/promise";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { borderRadius, spacing, useTheme } from "@/theme";
import { Text, TextInput } from "@/components/primitives";
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

export function SessionList({
  onClose,
  dockAnimatedStyle,
}: {
  onClose: () => void;
  dockAnimatedStyle?: AnimatedStyle<ViewStyle>;
}) {
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
  const [query, setQuery] = useState("");
  const [projectQuery, setProjectQuery] = useState("");
  const dockClearance = spacing.sm + 46 + spacing.sm;

  const activeProject = findActiveProject(projects, activeLocation.directory);
  const projectLabel = activeLocation.directory
    ? activeProject
      ? projectDisplayName(activeProject)
      : pathBasename(activeLocation.directory)
    : "Choose a project";

  const visibleSessions = activeProject
    ? sessionsForProject(sessions, activeProject.id)
    : [];
  const trimmed = query.trim().toLowerCase();
  const filteredSessions = trimmed
    ? visibleSessions.filter((session) =>
        (session.title || "Untitled").toLowerCase().includes(trimmed),
      )
    : visibleSessions;
  const sections = sessionSections(filteredSessions);

  const projectTrimmed = projectQuery.trim().toLowerCase();
  const filteredProjects = projectTrimmed
    ? projects.filter((project) =>
        `${projectDisplayName(project)} ${project.canonical}`
          .toLowerCase()
          .includes(projectTrimmed),
      )
    : projects;

  function openSession(id: string) {
    router.push({ pathname: "/session/[id]", params: { id } });
    onClose();
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
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background.default },
        ]}
      >
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
        <View
          style={[
            styles.searchRow,
            { borderColor: colors.border.default },
          ]}
        >
          <Search size={16} color={colors.icon.muted} />
          <TextInput
            value={projectQuery}
            onChangeText={setProjectQuery}
            placeholder="Search projects"
            placeholderTextColor={colors.text.secondary}
            accessibilityLabel="Search projects"
            returnKeyType="search"
            style={styles.searchInput}
          />
          {projectQuery ? (
            <TouchableOpacity
              onPress={() => setProjectQuery("")}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={16} color={colors.icon.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <ProjectPicker
          projects={filteredProjects}
          loaded={projectsLoaded}
          onSelect={handleProjectSelect}
          onRefresh={() => void syncProjectList()}
          query={projectTrimmed}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionCard session={item} onPress={() => openSession(item.id)} />
        )}
        renderSectionHeader={({ section }) => (
          <Text variant="caption" color="secondary" style={styles.sectionHeader}>
            {section.title}
          </Text>
        )}
        ItemSeparatorComponent={RowSeparator}
        stickySectionHeadersEnabled={false}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <>
            <View
              style={[
                styles.searchRow,
                { borderColor: colors.border.default },
              ]}
            >
              <Search size={16} color={colors.icon.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={
                  activeProject
                    ? `Search "${projectLabel}"`
                    : "Search sessions"
                }
                placeholderTextColor={colors.text.secondary}
                accessibilityLabel="Search sessions"
                returnKeyType="search"
                style={styles.searchInput}
              />
              {query ? (
                <TouchableOpacity
                  onPress={() => setQuery("")}
                  activeOpacity={0.6}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <X size={16} color={colors.icon.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            {query.trim() ? (
              <Text color="secondary">No sessions match</Text>
            ) : activeProject ? (
              <Text color="secondary">No sessions in this project yet</Text>
            ) : (
              <Text color="secondary">Choose a project to start</Text>
            )}
          </View>
        }
        contentContainerStyle={[
          {
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + dockClearance,
            flexGrow: 1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.dock,
          {
            backgroundColor: colors.background.default,
            borderTopColor: colors.border.subtle,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
          },
          dockAnimatedStyle,
        ]}
      >
        <TouchableOpacity
          onPress={() => setView("projects")}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Choose project"
          style={[
            styles.dockProject,
            { backgroundColor: colors.background.surface, borderColor: colors.border.default },
          ]}
        >
          <FolderOpen size={18} color={colors.icon.muted} />
          <Text variant="label" numberOfLines={1} style={styles.flex}>
            {projectLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNewSession}
          disabled={isCreating}
          accessibilityRole="button"
          accessibilityLabel="New session"
          style={[
            styles.dockNewSession,
            {
              backgroundColor: colors.action.primary,
              opacity: isCreating || !activeProject ? 0.6 : 1,
            },
          ]}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={colors.action.primaryText} />
          ) : (
            <>
              <Plus size={18} color={colors.action.primaryText} />
              <Text variant="label" style={{ color: colors.action.primaryText }}>
                New session
              </Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function RowSeparator() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.separator,
        { backgroundColor: colors.border.subtle },
      ]}
    />
  );
}

type SessionSection = { title: string; data: SessionInfo[] };

/** Calendar-day groups matching the web sidebar: Today / Yesterday / Older. */
function sessionSections(sessions: SessionInfo[]): SessionSection[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isSameDay = (ms: number, ref: Date) => {
    const date = new Date(ms);
    return (
      date.getFullYear() === ref.getFullYear() &&
      date.getMonth() === ref.getMonth() &&
      date.getDate() === ref.getDate()
    );
  };
  const todays = sessions.filter((session) => isSameDay(session.time.updated, today));
  const yesterdays = sessions.filter((session) => isSameDay(session.time.updated, yesterday));
  const older = sessions.filter(
    (session) => !isSameDay(session.time.updated, today) && !isSameDay(session.time.updated, yesterday),
  );
  const sections: SessionSection[] = [];
  if (todays.length > 0) sections.push({ title: "Today", data: todays });
  if (yesterdays.length > 0) sections.push({ title: "Yesterday", data: yesterdays });
  if (older.length > 0) {
    sections.push({
      title: todays.length > 0 || yesterdays.length > 0 ? "Older" : "Recent sessions",
      data: older,
    });
  }
  return sections;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.md,
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dockProject: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
  },
  dockNewSession: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 46,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.lg,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

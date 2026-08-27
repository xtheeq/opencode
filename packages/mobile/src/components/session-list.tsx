import { useEffect, useRef, useState } from "react";
import Plus from "lucide-react-native/icons/plus";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import FolderOpen from "lucide-react-native/icons/folder-open";
import Search from "lucide-react-native/icons/search";
import X from "lucide-react-native/icons/x";
import {
  ActivityIndicator,
  Keyboard,
  SectionList,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { router } from "expo-router";
import type { SessionInfo } from "@opencode-ai/client/promise";
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
  const [searchActive, setSearchActive] = useState(false);
  const [projectQuery, setProjectQuery] = useState("");
  const searchInputRef = useRef<RNTextInput | null>(null);
  const dockClearance = spacing.sm + 46 + spacing.sm;

  useEffect(() => {
    if (searchActive) searchInputRef.current?.focus();
  }, [searchActive]);

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

  const searchValue = view === "sessions" ? query : projectQuery;
  const setSearchValue = view === "sessions" ? setQuery : setProjectQuery;
  const searchPlaceholder =
    view === "sessions"
      ? activeProject
        ? `Search "${projectLabel}"`
        : "Search sessions"
      : "Search projects";

  function clearSearch() {
    setSearchValue("");
  }

  function openSession(id: string) {
    setQuery("");
    setSearchActive(false);
    Keyboard.dismiss();
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

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      {view === "sessions" ? (
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
          keyboardShouldPersistTaps="handled"
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
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
      ) : (
        <View
          style={[
            styles.projectList,
            { paddingBottom: insets.bottom + dockClearance },
          ]}
        >
          <ProjectPicker
            projects={filteredProjects}
            loaded={projectsLoaded}
            onSelect={handleProjectSelect}
            onRefresh={() => void syncProjectList()}
            query={projectTrimmed}
          />
        </View>
      )}
      {searchActive ? (
        <KeyboardStickyView
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.background.elevated,
              borderTopColor: colors.border.subtle,
            },
          ]}
          offset={{ closed: 0, opened: insets.bottom + 1 }}
        >
          <View style={styles.searchBarRow}>
            <Search size={16} color={colors.icon.muted} />
            <RNTextInput
              ref={searchInputRef}
              autoFocus
              value={searchValue}
              onChangeText={setSearchValue}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.text.secondary}
              accessibilityLabel="Search"
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.text.primary }]}
            />
            <TouchableOpacity
              onPress={() => {
                if (searchValue) {
                  clearSearch();
                } else {
                  setSearchActive(false);
                  Keyboard.dismiss();
                }
              }}
              activeOpacity={0.6}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={searchValue ? "Clear search" : "Close search"}
            >
              <X size={16} color={colors.icon.muted} />
            </TouchableOpacity>
          </View>
        </KeyboardStickyView>
      ) : (
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
            onPress={() => {
              setSearchActive(true);
              searchInputRef.current?.focus();
            }}
            activeOpacity={0.6}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Search sessions"
            style={[
              styles.dockIcon,
              { backgroundColor: colors.background.surface, borderColor: colors.border.default },
            ]}
          >
            <Search size={20} color={colors.icon.default} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              setView(view === "sessions" ? "projects" : "sessions")
            }
            activeOpacity={0.6}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              view === "sessions" ? "Choose project" : "Back to sessions"
            }
            style={[
              styles.dockProject,
              { backgroundColor: colors.background.surface, borderColor: colors.border.default },
            ]}
          >
            {view === "sessions" ? (
              <>
                <FolderOpen size={18} color={colors.icon.muted} />
                <Text variant="label" numberOfLines={1}>
                  {projectLabel}
                </Text>
              </>
            ) : (
              <>
                <ChevronLeft size={18} color={colors.icon.default} />
                <Text variant="label" numberOfLines={1}>Sessions</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNewSession}
            disabled={isCreating}
            activeOpacity={0.6}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="New session"
            style={[
              styles.dockIcon,
              styles.dockPrimary,
              {
                backgroundColor: colors.action.primary,
                opacity: isCreating || !activeProject ? 0.6 : 1,
              },
            ]}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color={colors.action.primaryText} />
            ) : (
              <Plus size={20} color={colors.action.primaryText} />
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
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
  projectList: {
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
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dockIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: borderRadius.pill,
  },
  dockPrimary: {
    borderWidth: 0,
  },
  dockProject: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
  },
  searchBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

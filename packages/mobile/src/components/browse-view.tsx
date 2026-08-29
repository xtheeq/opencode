import { useEffect, useRef, useState } from "react";
import Plus from "lucide-react-native/icons/plus";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import FolderOpen from "lucide-react-native/icons/folder-open";
import Search from "lucide-react-native/icons/search";
import X from "lucide-react-native/icons/x";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { borderRadius, spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import { SessionTab } from "@/components/session-tab";
import { ProjectTab } from "@/components/project-tab";
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

export function BrowseView({
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
  const filteredProjects = trimmed
    ? projects.filter((project) =>
        `${projectDisplayName(project)} ${project.canonical}`
          .toLowerCase()
          .includes(trimmed),
      )
    : projects;
  const searchPlaceholder =
    view === "sessions"
      ? activeProject
        ? `Search "${projectLabel}"`
        : "Search sessions"
      : "Search projects";

  const emptyMessage = query.trim()
    ? "No sessions match"
    : activeProject
      ? "No sessions in this project yet"
      : "Choose a project to start";

  function clearSearch() {
    setQuery("");
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
    setQuery("");
    setSearchActive(false);
    Keyboard.dismiss();
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
        <SessionTab
          sessions={filteredSessions}
          emptyMessage={emptyMessage}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          onOpenSession={openSession}
          contentContainerStyle={{
            paddingBottom: insets.bottom + dockClearance,
          }}
        />
      ) : (
        <View
          style={[
            styles.projectList,
            { paddingBottom: insets.bottom + dockClearance },
          ]}
        >
          <ProjectTab
            projects={filteredProjects}
            loaded={projectsLoaded}
            onSelect={handleProjectSelect}
            onRefresh={() => void syncProjectList()}
            query={trimmed}
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
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.text.secondary}
              accessibilityLabel="Search"
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.text.primary }]}
            />
            <TouchableOpacity
              onPress={() => {
                if (query) {
                  clearSearch();
                } else {
                  setSearchActive(false);
                  Keyboard.dismiss();
                }
              }}
              activeOpacity={0.6}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={query ? "Clear search" : "Close search"}
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
            accessibilityLabel={
              view === "projects" ? "Search projects" : "Search sessions"
            }
            style={[
              styles.dockIcon,
              {
                backgroundColor: colors.background.surface,
                borderColor: colors.border.default,
              },
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
              {
                backgroundColor: colors.background.surface,
                borderColor: colors.border.default,
              },
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
                <Text variant="label" numberOfLines={1}>
                  Sessions
                </Text>
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
              <ActivityIndicator
                size="small"
                color={colors.action.primaryText}
              />
            ) : (
              <Plus size={20} color={colors.action.primaryText} />
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  projectList: {
    flex: 1,
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

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { AppHeader } from "@/components/app-header";
import { Composer } from "@/components/composer";
import { ProjectPicker } from "@/components/project-picker";
import { composerReset } from "@/stores/composer";
import { useActiveLocation, useProjects, useProjectsLoaded } from "@/hooks/use-store";
import { activateDefaultLocation, selectProject } from "@/stores/project";
import { syncProjectList } from "@/stores/sync";

// Reserved key for the "new session" composer on this screen. Real session ids
// are `ses_*`, so this cannot collide with an existing session.
const NEW_SESSION_KEY = "new";

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const projects = useProjects();
  const projectsLoaded = useProjectsLoaded();
  const { directory } = useActiveLocation();
  const [selecting, setSelecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Cold launch with no selected project lands on the picker. The project list
  // is synced on connect; this only covers the rare case where the screen
  // mounts before that sync has landed.
  useEffect(() => {
    if (!projectsLoaded) void syncProjectList().catch(() => undefined);
  }, [projectsLoaded]);

  // A new session is scoped to the selected project; switching it (via the
  // drawer) clears any half-typed draft so mentions never reference the old
  // project. Track the previous directory so the initial mount never wipes a
  // draft.
  const [previousDirectory, setPreviousDirectory] = useState(directory);
  useEffect(() => {
    if (directory === previousDirectory) return;
    composerReset(NEW_SESSION_KEY);
    setPreviousDirectory(directory);
  }, [directory, previousDirectory]);

  const select = async (nextDirectory: string) => {
    if (selecting) return;
    setSelecting(true);
    try {
      await selectProject(nextDirectory);
    } finally {
      setSelecting(false);
    }
  };

  const useDefault = async () => {
    if (selecting) return;
    setSelecting(true);
    try {
      await activateDefaultLocation();
    } finally {
      setSelecting(false);
    }
  };

  const refreshProjects = async () => {
    setRefreshing(true);
    await syncProjectList().catch(() => undefined);
    setRefreshing(false);
  };

  function navigateToSession(sessionID: string) {
    router.push({ pathname: "/session/[id]", params: { id: sessionID } });
  }

  return (
    <View
      style={[
        styles.connectedContainer,
        { backgroundColor: colors.background.default },
      ]}
    >
      <AppHeader />
      {directory ? (
        <>
          <View style={{ flex: 1 }} />
          <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
            <Composer sessionID={NEW_SESSION_KEY} onSubmitted={navigateToSession} />
          </KeyboardStickyView>
        </>
      ) : (
        <ProjectPicker
          projects={projects}
          loaded={projectsLoaded}
          onSelect={select}
          onUseDefault={useDefault}
          refreshing={refreshing}
          onRefresh={refreshProjects}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  connectedContainer: {
    flex: 1,
  },
});

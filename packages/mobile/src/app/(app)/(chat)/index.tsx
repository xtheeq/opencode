import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { AppHeader } from "@/components/app-header";
import { PromptInput } from "@/components/prompt-input";
import { ProjectPicker } from "@/components/project-picker";
import { useCreateSession } from "@/hooks/use-create-session";
import {
  useActiveLocation,
  useProjects,
  useProjectsLoaded,
} from "@/hooks/use-store";
import { activateDefaultLocation, selectProject } from "@/stores/project";
import { getClient } from "@/stores/store";
import { syncProjectList } from "@/stores/sync";

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { createSession } = useCreateSession();
  const projects = useProjects();
  const projectsLoaded = useProjectsLoaded();
  const activeLocation = useActiveLocation();
  const [mode, setMode] = useState<"picker" | "compose">(
    activeLocation.directory ? "compose" : "picker",
  );
  const [switching, setSwitching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Cold launch with no selected project lands on the picker. The project list
  // is synced on connect; this only covers the rare case where the screen
  // mounts before that sync has landed.
  useEffect(() => {
    if (!projectsLoaded) void syncProjectList().catch(() => undefined);
  }, [projectsLoaded]);

  const select = async (directory: string) => {
    if (switching) return;
    setSwitching(true);
    try {
      await selectProject(directory);
      setMode("compose");
    } finally {
      setSwitching(false);
    }
  };

  const useDefault = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      await activateDefaultLocation();
      setMode("compose");
    } finally {
      setSwitching(false);
    }
  };

  const refreshProjects = async () => {
    setRefreshing(true);
    await syncProjectList().catch(() => undefined);
    setRefreshing(false);
  };

  async function handleInitialSend(text: string) {
    const session = await createSession();
    await getClient().session.prompt({
      sessionID: session.id,
      text,
      delivery: "steer",
    });
    router.push({ pathname: "/session/[id]", params: { id: session.id } });
  }

  if (mode === "picker") {
    return (
      <View
        style={[
          styles.connectedContainer,
          { backgroundColor: colors.background.default },
        ]}
      >
        <AppHeader />
        <ProjectPicker
          projects={projects}
          loaded={projectsLoaded}
          onSelect={select}
          onUseDefault={useDefault}
          refreshing={refreshing}
          onRefresh={refreshProjects}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.connectedContainer,
        { backgroundColor: colors.background.default },
      ]}
    >
      <AppHeader />
      <View style={{ flex: 1 }} />
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <PromptInput
          onSubmit={handleInitialSend}
          placeholder="Start a new session..."
        />
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  connectedContainer: {
    flex: 1,
  },
});

import { useEffect } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { KeyboardGestureArea, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { AppHeader } from "@/components/app-header";
import { MessageTimeline } from "@/components/message-timeline";
import { PromptInput } from "@/components/prompt-input";
import { BlockerDock } from "@/components/blockers";
import { useSessionBlockers } from "@/hooks/use-blockers";
import { useSessionInfo } from "@/hooks/use-store";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSessionInfo(id);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { blocker, blocked } = useSessionBlockers(id);

  useEffect(() => {
    if (blocked) Keyboard.dismiss();
  }, [blocked]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      <AppHeader title={session?.title || "Untitled"} />
      <KeyboardGestureArea interpolator="ios" style={styles.body}>
        <MessageTimeline sessionID={id} />
      </KeyboardGestureArea>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        {blocked && blocker ? <BlockerDock blocker={blocker} /> : null}
        {/* Keep PromptInput mounted so a half-typed draft survives while blocked. */}
        <View style={blocked ? styles.hidden : undefined}>
          <PromptInput sessionID={id} />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  hidden: {
    display: "none",
  },
});

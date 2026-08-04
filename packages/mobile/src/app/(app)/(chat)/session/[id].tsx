import { useEffect } from "react";
import { Keyboard, StyleSheet, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import {
  KeyboardGestureArea,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MenuIcon from "lucide-react-native/icons/menu";
import { spacing, useTheme } from "@/theme";
import { MessageTimeline } from "@/components/message-timeline";
import { PromptInput } from "@/components/prompt-input";
import { BlockerDock } from "@/components/blockers";
import { useSessionBlockers } from "@/hooks/use-blockers";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { blocker, blocked } = useSessionBlockers(id);

  useEffect(() => {
    if (blocked) Keyboard.dismiss();
  }, [blocked]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          accessibilityLabel="Open sessions"
          hitSlop={8}
        >
          <MenuIcon size={20} color={colors.icon.default} />
        </TouchableOpacity>
      </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  body: {
    flex: 1,
  },
  hidden: {
    display: "none",
  },
});

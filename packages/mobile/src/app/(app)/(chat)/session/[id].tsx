import { useEffect, useRef } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { useKeyboardChatComposerInset } from "@legendapp/list/keyboard";
import type { LegendListRef } from "@legendapp/list/react-native";
import { useLocalSearchParams } from "expo-router";
import {
  KeyboardGestureArea,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { SwipeMenuShell } from "@/components/swipe-menu-shell";
import { AppHeader } from "@/components/app-header";
import { MessageTimeline } from "@/components/message-timeline";
import { Composer } from "@/components/composer";
import { BlockerDock } from "@/components/blockers";
import { useSessionBlockers } from "@/hooks/use-blockers";
import { useSessionInfo } from "@/hooks/use-store";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSessionInfo(id);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { blocker, blocked } = useSessionBlockers(id);
  const listRef = useRef<LegendListRef>(null);
  const composerRef = useRef<View>(null);
  const { contentInsetEndAdjustment, onComposerLayout } =
    useKeyboardChatComposerInset(listRef, composerRef);

  useEffect(() => {
    if (blocked) Keyboard.dismiss();
  }, [blocked]);

  return (
    <SwipeMenuShell>
      <View
        style={[styles.container, { backgroundColor: colors.background.default }]}
      >
        <AppHeader title={session?.title || "Untitled"} />
        <KeyboardGestureArea interpolator="ios" style={styles.body}>
          <MessageTimeline
            sessionID={id}
            listRef={listRef}
            contentInsetEndAdjustment={contentInsetEndAdjustment}
          />
        </KeyboardGestureArea>
        {/* Floating over the timeline; box-none lets touches fall through the
            empty space around the card so messages underneath stay scrollable.
            The dock itself is measured so the list keeps its end clear of it. */}
        <KeyboardStickyView
          ref={composerRef}
          onLayout={onComposerLayout}
          offset={{ closed: 0, opened: insets.bottom }}
          style={styles.dock}
          pointerEvents="box-none"
        >
          {blocked && blocker ? <BlockerDock blocker={blocker} /> : null}
          {/* Keep Composer mounted so a half-typed draft survives while blocked. */}
          <View
            style={blocked ? styles.hidden : undefined}
            pointerEvents="box-none"
          >
            <Composer sessionID={id} />
          </View>
        </KeyboardStickyView>
      </View>
    </SwipeMenuShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  hidden: {
    display: "none",
  },
});

import { StyleSheet, TouchableOpacity, View } from "react-native";
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

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          accessibilityLabel="Open sessions"
          hitSlop={8}
        >
          <MenuIcon size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
      <KeyboardGestureArea interpolator="ios" style={styles.body}>
        <MessageTimeline sessionID={id} />
      </KeyboardGestureArea>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <PromptInput sessionID={id} />
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
});

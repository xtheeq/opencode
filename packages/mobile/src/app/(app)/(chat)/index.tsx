import { StyleSheet, TouchableOpacity, View } from "react-native";
import { router, useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useTheme } from "@/theme";
import MenuIcon from "lucide-react-native/icons/menu";
import { PromptInput } from "@/components/prompt-input";
import { useCreateSession } from "@/hooks/use-create-session";
import { getClient } from "@/services/api";

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { createSession } = useCreateSession();
  const navigation = useNavigation();

  async function handleInitialSend(text: string) {
    const session = await createSession();
    await getClient().session.prompt({
      sessionID: session.id,
      text,
      delivery: "steer",
    });
    router.push({ pathname: "/session/[id]", params: { id: session.id } });
  }

  return (
    <View
      style={[
        styles.connectedContainer,
        { backgroundColor: colors.background.default },
      ]}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
});

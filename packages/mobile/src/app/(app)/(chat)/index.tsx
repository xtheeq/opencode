import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { AppHeader } from "@/components/app-header";
import { PromptInput } from "@/components/prompt-input";
import { useCreateSession } from "@/hooks/use-create-session";
import { getClient } from "@/services/api";

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { createSession } = useCreateSession();

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

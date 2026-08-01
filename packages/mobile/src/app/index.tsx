import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConnection } from "@/services/connection";
import { spacing, useTheme } from "@/theme";
import HistoryIcon from "lucide-react-native/icons/history";
import { Button, Text } from "@/components/primitives";
import { ConnectForm } from "@/components/connect-form";
import { PromptInput } from "@/components/prompt-input";
import { useCreateSession } from "@/hooks/use-create-session";
import { getClient } from "@/services/api";

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { status, url, disconnect } = useConnection();
  const { createSession } = useCreateSession();

  async function handleInitialSend(text: string) {
    const session = await createSession();
    await getClient().session.prompt({
      sessionID: session.id,
      text,
      delivery: "steer",
    });
    router.push(`/session/${session.id}`);
  }

  if (status === "loading") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (status === "idle") return <ConnectForm />;

  if (status === "connected") {
    return (
      <View
        style={[
          styles.connectedContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/sessions")}>
            <HistoryIcon size={20} color={colors.textSecondary} />
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={require("@/assets/icon.png")} style={styles.icon} />
      <Text variant="heading">opencode</Text>
      {url && (
        <Text variant="caption" color="textSecondary" style={styles.urlText}>
          {url}
        </Text>
      )}
      <View style={styles.statusRow}>
        {status === "checking" && (
          <ActivityIndicator size="small" color={colors.text} />
        )}
        <Text
          variant="caption"
          color={status === "checking" ? "textSecondary" : "error"}
        >
          {status === "checking" ? "Connecting..." : "Connection failed"}
        </Text>
      </View>
      <Button
        title="Change Server"
        style={styles.navButton}
        onPress={disconnect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  connectedContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  icon: {
    width: 128,
    height: 128,
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  urlText: {
    marginTop: spacing.xs,
  },
  navButton: {
    marginTop: spacing.lg,
  },
});

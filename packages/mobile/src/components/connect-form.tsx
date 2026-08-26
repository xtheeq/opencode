import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { connect } from "@/services/connection";
import { useConnectionStatus, useServerUrl } from "@/hooks/use-store";
import { spacing, useTheme } from "@/theme";
import { Button, Text, TextInput } from "@/components/primitives";

export function ConnectForm() {
  const { colors } = useTheme();
  const router = useRouter();
  const connection = useConnectionStatus();
  const storedUrl = useServerUrl();
  // Undefined until the user edits: the stored URL wins until then, so a
  // relaunch with saved credentials prefills without racing the SecureStore
  // read that happens while the splash still covers this screen.
  const [draftUrl, setDraftUrl] = useState<string>();
  const [password, setPassword] = useState("");

  const url = draftUrl ?? storedUrl ?? "http://";
  const checking =
    connection.status === "connecting" || connection.status === "reconnecting";
  const failed =
    connection.status === "disconnected" && !connection.everConnected;
  const disabled = checking || !url.trim();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      <Text variant="title" style={styles.textCenter}>
        OpenCode
      </Text>
      <Text variant="body" color="secondary" style={styles.subtitle}>
        Connect to your server
      </Text>
      <TextInput
        placeholder="http://localhost:4096"
        value={url}
        onChangeText={setDraftUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <TextInput
        placeholder="Password (optional)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      {failed && connection.error ? (
        <Text variant="caption" color="error">
          {connection.error}
        </Text>
      ) : null}
      <Button
        title="Connect"
        loading={checking}
        disabled={disabled}
        onPress={() => connect(url, password || undefined)}
      />
      <TouchableOpacity
        style={styles.scan}
        onPress={() => router.push("/scan")}
      >
        <Text variant="label" color="accent">
          Scan QR Code
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  textCenter: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  scan: {
    alignSelf: "center",
    padding: spacing.sm,
  },
});

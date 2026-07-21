import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useConnection } from "@/services/connection";
import { borderRadius, spacing, typography, useTheme } from "@/theme";

export function ConnectForm() {
  const { colors } = useTheme();
  const { connect, status } = useConnection();
  const [inputUrl, setInputUrl] = useState("http://");

  const disabled = status === "checking" || !inputUrl.trim();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>OpenCode</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Connect to your server
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
        placeholder="http://localhost:4096"
        placeholderTextColor={colors.textSecondary}
        value={inputUrl}
        onChangeText={setInputUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.primary, opacity: disabled ? 0.5 : 1 },
        ]}
        disabled={disabled}
        onPress={() => connect(inputUrl)}
      >
        {status === "checking" ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
            Connect
          </Text>
        )}
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
  title: {
    ...typography.title,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
  },
  button: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  buttonText: {
    ...typography.body,
    fontWeight: "600",
  },
});

import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useConnection } from "@/services/connection";
import { spacing, useTheme } from "@/theme";
import { Button, Text, TextInput } from "@/components/primitives";

export function ConnectForm() {
  const { colors } = useTheme();
  const { connect, status } = useConnection();
  const [inputUrl, setInputUrl] = useState("http://");

  const disabled = status === "checking" || !inputUrl.trim();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text variant="title" style={styles.textCenter}>
        OpenCode
      </Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        Connect to your server
      </Text>
      <TextInput
        placeholder="http://localhost:4096"
        value={inputUrl}
        onChangeText={setInputUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Button
        title="Connect"
        loading={status === "checking"}
        disabled={disabled}
        onPress={() => connect(inputUrl)}
      />
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
});

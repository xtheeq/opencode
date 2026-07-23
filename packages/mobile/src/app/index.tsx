import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useConnection } from "@/services/connection";
import { spacing, useTheme } from "@/theme";
import { Button, Text } from "@/components/primitives";
import { ConnectForm } from "@/components/connect-form";

export default function HomeScreen() {
  const { colors } = useTheme();
  const { status, url, disconnect } = useConnection();

  if (status === "loading") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (status === "idle") return <ConnectForm />;

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
          color={status === "connected" ? "success" : "error"}
        >
          {status === "checking"
            ? "Connecting..."
            : status === "connected"
              ? "Connected"
              : "Connection failed"}
        </Text>
      </View>
      {status === "connected" && (
        <Button
          title="View Sessions"
          style={styles.navButton}
          onPress={() => router.push("/sessions")}
        />
      )}
      {status === "error" && (
        <Button
          title="Change Server"
          style={styles.navButton}
          onPress={disconnect}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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

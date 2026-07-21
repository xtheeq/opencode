import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { useConnection } from "@/services/connection";
import { spacing, typography, useTheme } from "@/theme";
import { ConnectForm } from "@/components/connect-form";

export default function HomeScreen() {
  const { colors } = useTheme();
  const { status, url } = useConnection();

  if (status === "idle") return <ConnectForm />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={require("@/assets/icon.png")} style={styles.icon} />
      <Text style={[styles.text, { color: colors.text }]}>opencode</Text>
      <Text style={[styles.urlText, { color: colors.textSecondary }]}>
        {url}
      </Text>
      <View style={styles.statusRow}>
        {status === "checking" && (
          <ActivityIndicator size="small" color={colors.text} />
        )}
        <Text
          style={[
            styles.statusText,
            { color: status === "connected" ? colors.success : colors.error },
          ]}
        >
          {status === "checking"
            ? "Connecting..."
            : status === "connected"
              ? "Connected"
              : "Connection failed"}
        </Text>
      </View>
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
  text: {
    ...typography.heading,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  urlText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  statusText: {
    ...typography.caption,
  },
});

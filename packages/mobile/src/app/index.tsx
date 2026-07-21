import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { useConnection } from "@/services/connection";
import { useTheme, typography } from "@/theme";

export default function HomeScreen() {
  const { colors } = useTheme();
  const { status } = useConnection();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={require("@/assets/icon.png")} style={styles.icon} />
      <Text style={[styles.text, { color: colors.text }]}>opencode</Text>
      <View style={styles.statusRow}>
        {status === "checking" && <ActivityIndicator size="small" color={colors.text} />}
        <Text style={[styles.statusText, { color: status === "connected" ? colors.success : colors.error }]}>
          {status === "checking" ? "Connecting..." : status === "connected" ? "Connected" : "Disconnected"}
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
    marginBottom: 24,
  },
  text: {
    ...typography.heading,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  statusText: {
    fontSize: 14,
  },
});

import { ActivityIndicator, Image, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useConnection } from "@/services/connection";

export default function HomeScreen() {
  const isDark = useColorScheme() === "dark";
  const { status } = useConnection();
  const fg = isDark ? "#fff" : "#000";
  const bg = isDark ? "#000" : "#fff";
  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Image source={require("@/assets/icon.png")} style={styles.icon} />
      <Text style={[styles.text, { color: fg }]}>opencode</Text>
      <View style={styles.statusRow}>
        {status === "checking" && <ActivityIndicator size="small" color={fg} />}
        <Text style={[styles.statusText, { color: status === "connected" ? "#34c759" : "#ff3b30" }]}>
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
    fontSize: 24,
    fontWeight: "600",
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

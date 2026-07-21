import { Image, StyleSheet, Text, useColorScheme, View } from "react-native";

export default function HomeScreen() {
  const isDark = useColorScheme() === "dark";
  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}
    >
      <Image source={require("@/assets/icon.png")} style={styles.icon} />
      <Text style={[styles.text, { color: isDark ? "#fff" : "#000" }]}>
        opencode
      </Text>
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
});

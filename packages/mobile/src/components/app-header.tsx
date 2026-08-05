import { StyleSheet, Pressable, View } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import MenuIcon from "lucide-react-native/icons/menu";
import { spacing, useTheme } from "@/theme";
import { SignalIndicator } from "@/components/signal-indicator";

export function AppHeader() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        accessibilityLabel="Open sessions"
        hitSlop={8}
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      >
        <MenuIcon size={20} color={colors.icon.default} />
      </Pressable>
      <View style={styles.spacer} />
      <SignalIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  spacer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});

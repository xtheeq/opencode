import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import MenuIcon from "lucide-react-native/icons/menu";
import { spacing, useTheme } from "@/theme";

export function AppHeader() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        accessibilityLabel="Open sessions"
        hitSlop={8}
      >
        <MenuIcon size={20} color={colors.icon.default} />
      </TouchableOpacity>
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
});

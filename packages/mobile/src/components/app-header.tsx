import { useState } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "expo-router/react-navigation";
import MenuIcon from "lucide-react-native/icons/menu";
import { spacing, useTheme } from "@/theme";
import { CueIndicator } from "@/components/cue-indicator";
import { CueSheet } from "@/components/cue-sheet";
import { CueSlot } from "@/components/cue-slot";

const ICON_SIZE = 20;

export function AppHeader({ title }: { title?: string }) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [cuesOpen, setCuesOpen] = useState(false);

  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        accessibilityLabel="Open sessions"
        hitSlop={8}
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      >
        <MenuIcon size={ICON_SIZE} color={colors.icon.default} />
      </Pressable>
      <View style={styles.titleSlot}>
        <CueSlot title={title} onPress={() => setCuesOpen(true)} />
      </View>
      <CueIndicator onPress={() => setCuesOpen(true)} />
      <CueSheet visible={cuesOpen} onClose={() => setCuesOpen(false)} />
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
  titleSlot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});

import { View, StyleSheet, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { spacing } from "@/theme";

export function BubbleContainer({
  alignment,
  fullWidth,
  style,
  children,
}: {
  alignment: "flex-start" | "flex-end" | "center";
  fullWidth?: boolean;
  style?: ViewStyle;
  children: ReactNode;
}) {
  return (
    <View style={[styles.row, { justifyContent: alignment }]}>
      <View style={[fullWidth && styles.full, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  full: {
    flex: 1,
  },
});

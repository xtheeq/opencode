import { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet as UIBottomSheet } from "@expo/ui/community/bottom-sheet";
import X from "lucide-react-native/icons/x";
import { spacing, useTheme } from "@/theme";
import { Text } from "./text";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  showCloseButton?: boolean;
  showDragIndicator?: boolean;
  enablePanDownToClose?: boolean;
  snapPoints?: (string | number)[];
  initialIndex?: number;
  children?: ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  showCloseButton = true,
  showDragIndicator = true,
  enablePanDownToClose = true,
  snapPoints,
  initialIndex = 0,
  children,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <UIBottomSheet
      index={visible ? initialIndex : -1}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: colors.background.elevated }}
      enablePanDownToClose={enablePanDownToClose}
      handleComponent={showDragIndicator ? undefined : null}
      onClose={onClose}
    >
      <View
        style={[styles.content, { paddingBottom: insets.bottom + spacing.md }]}
      >
        {title || showCloseButton ? (
          <View style={styles.header}>
            <View style={styles.headerText}>
              {title ? <Text variant="label">{title}</Text> : null}
            </View>
            {showCloseButton ? (
              <Pressable
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => (pressed ? styles.pressed : undefined)}
              >
                <X size={18} color={colors.icon.default} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {children}
      </View>
    </UIBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});

import { type ReactNode } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { borderRadius, spacing, useTheme } from "@/theme";

export interface DialogProps {
  visible: boolean;
  onRequestClose?: () => void;
  children?: ReactNode;
}

export function Dialog({ visible, onRequestClose, children }: DialogProps) {
  const { colors, effects } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onRequestClose ?? (() => {})}
    >
      <View
        style={[styles.backdrop, { backgroundColor: effects.overlay.scrim }]}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.background.elevated,
              ...effects.elevation.overlay,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
});

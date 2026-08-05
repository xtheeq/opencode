import { useEffect } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import X from "lucide-react-native/icons/x";
import { borderRadius, spacing, useTheme } from "@/theme";
import { Button, Text } from "@/components/primitives";
import { dismissAllSignals, dismissSignal, signalStore } from "@/stores/signals";
import { SIGNAL_ICON, signalTint } from "@/components/signal-style";
import type { Signal } from "@/types/signal";

export function SignalSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, effects } = useTheme();
  const insets = useSafeAreaInsets();
  const signals = signalStore((s) => s.signals);

  useEffect(() => {
    if (visible && signals.length === 0) onClose();
  }, [visible, signals.length, onClose]);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: effects.overlay.scrim },
          ]}
          onPress={onClose}
          accessibilityLabel="Close alerts"
        />
        <Animated.View
          entering={SlideInDown}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background.elevated,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <Text variant="label">Alerts</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
              <X size={18} color={colors.icon.default} />
            </Pressable>
          </View>
          <ScrollView style={styles.list}>
            {signals.map((signal) => (
              <SignalRow key={signal.id} signal={signal} />
            ))}
          </ScrollView>
          {signals.length > 1 ? (
            <Button
              title="Dismiss all"
              onPress={() => {
                dismissAllSignals();
                onClose();
              }}
              style={styles.dismissAll}
            />
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  const { colors } = useTheme();
  const Icon = SIGNAL_ICON[signal.kind];

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
      ]}
    >
      <Icon size={18} color={signalTint(signal.kind, colors)} />
      <View style={styles.rowContent}>
        <Text variant="body" numberOfLines={2}>
          {signal.title}
        </Text>
        {signal.description ? (
          <Text variant="caption" color="secondary" numberOfLines={3}>
            {signal.description}
          </Text>
        ) : null}
        {signal.actions?.length ? (
          <View style={styles.rowActions}>
            {signal.actions.map((action, index) => (
              <Pressable
                key={index}
                onPress={action.onPress}
                hitSlop={4}
                style={[
                  styles.actionButton,
                  { borderColor: colors.border.strong },
                ]}
              >
                <Text variant="label">{action.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={() => dismissSignal(signal.id)}
        hitSlop={8}
        accessibilityLabel="Dismiss alert"
      >
        <X size={16} color={colors.icon.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: spacing.sm,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  rowContent: {
    flex: 1,
  },
  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  dismissAll: {
    marginTop: spacing.sm,
  },
});

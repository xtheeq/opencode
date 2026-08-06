import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import X from "lucide-react-native/icons/x";
import { borderRadius, spacing, useTheme } from "@/theme";
import { BottomSheet, Button, Text } from "@/components/primitives";
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
  const { height } = useWindowDimensions();
  const signals = signalStore((s) => s.signals);

  useEffect(() => {
    if (visible && signals.length === 0) onClose();
  }, [visible, signals.length, onClose]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Alerts">
      <ScrollView
        style={[styles.list, { maxHeight: height * 0.7 }]}
        showsVerticalScrollIndicator={false}
      >
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
    </BottomSheet>
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

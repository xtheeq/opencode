import { Pressable, StyleSheet, Text as RNText, View } from "react-native";
import Bell from "lucide-react-native/icons/bell";
import { useTheme } from "@/theme";
import { selectForeground, signalStore } from "@/stores/signals";
import { SIGNAL_ICON, signalTint } from "@/components/signal-style";

export function SignalIndicator({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const signals = signalStore((s) => s.signals);
  const foreground = selectForeground(signals);
  const Icon = foreground ? SIGNAL_ICON[foreground.kind] : Bell;
  const tint = foreground
    ? signalTint(foreground.kind, colors)
    : colors.icon.muted;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Alerts"
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      <View>
        <Icon size={20} color={tint} />
        {signals.length > 1 ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.action.primary },
            ]}
          >
            <RNText style={[styles.badgeText, { color: colors.action.primaryText }]}>
              {signals.length}
            </RNText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 12,
  },
  pressed: {
    opacity: 0.6,
  },
});

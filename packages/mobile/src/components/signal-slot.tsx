import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";
import { spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import { SIGNAL_ICON, signalTint } from "@/components/signal-style";
import { selectForeground, signalStore } from "@/stores/signals";

export function SignalSlot({
  title,
  onPress,
}: {
  title?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const signals = signalStore((s) => s.signals);
  const foreground = selectForeground(signals);
  const entering = FadeIn.duration(200).reduceMotion(ReduceMotion.System);
  const exiting = FadeOut.duration(150).reduceMotion(ReduceMotion.System);

  if (!foreground) {
    return (
      <View style={styles.slot}>
        <Animated.View entering={entering} exiting={exiting} style={styles.content}>
          {title ? (
            <Text variant="label" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    );
  }

  const Icon = SIGNAL_ICON[foreground.kind];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={foreground.title}
      style={({ pressed }) => [styles.slot, pressed && styles.pressed]}
    >
      <Animated.View
        key={foreground.id}
        entering={entering}
        exiting={exiting}
        style={styles.content}
      >
        <Icon size={16} color={signalTint(foreground.kind, colors)} />
        <Text variant="label" numberOfLines={1} style={styles.message}>
          {foreground.title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  message: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});

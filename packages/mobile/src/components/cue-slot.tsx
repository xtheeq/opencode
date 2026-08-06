import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";
import { spacing, useTheme } from "@/theme";
import { Text } from "@/components/primitives";
import { CUE_ICON, cueTint } from "@/components/cue-style";
import { selectForeground, useCues } from "@/stores/cues";

export function CueSlot({
  title,
  onPress,
}: {
  title?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const cues = useCues();
  const foreground = selectForeground(cues);
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

  const Icon = CUE_ICON[foreground.kind];
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
        <Icon size={16} color={cueTint(foreground.kind, colors)} />
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

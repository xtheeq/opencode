import { Pressable, StyleSheet, Text as RNText, View } from "react-native";
import Animated, {
  FadeOut,
  ReduceMotion,
  SlideInRight,
} from "react-native-reanimated";
import { useTheme } from "@/theme";
import { selectForeground, useCues } from "@/stores/cues";
import { CUE_ICON, cueTint } from "@/components/cue-style";

export function CueIndicator({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const cues = useCues();
  const foreground = selectForeground(cues);
  const entering = SlideInRight.duration(200).reduceMotion(ReduceMotion.System);
  const exiting = FadeOut.duration(150).reduceMotion(ReduceMotion.System);

  if (!foreground) return null;

  const Icon = CUE_ICON[foreground.kind];

  return (
    <Animated.View entering={entering} exiting={exiting}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Alerts"
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      >
        <View>
          <Icon size={20} color={cueTint(foreground.kind, colors)} />
          {cues.length > 1 ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.action.primary },
              ]}
            >
              <RNText style={[styles.badgeText, { color: colors.action.primaryText }]}>
                {cues.length}
              </RNText>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
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

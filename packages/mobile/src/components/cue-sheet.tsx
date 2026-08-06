import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import X from "lucide-react-native/icons/x";
import { borderRadius, spacing, useTheme } from "@/theme";
import { BottomSheet, Button, Text } from "@/components/primitives";
import { cueStore, dismissAllCues, dismissCue } from "@/stores/cues";
import { CUE_ICON, cueTint } from "@/components/cue-style";
import type { Cue } from "@/types/cue";

export function CueSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { height } = useWindowDimensions();
  const cues = cueStore((s) => s.cues);

  useEffect(() => {
    if (visible && cues.length === 0) onClose();
  }, [visible, cues.length, onClose]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Alerts">
      <ScrollView
        style={[styles.list, { maxHeight: height * 0.7 }]}
        showsVerticalScrollIndicator={false}
      >
        {cues.map((cue) => (
          <CueRow key={cue.id} cue={cue} />
        ))}
      </ScrollView>
      {cues.length > 1 ? (
        <Button
          title="Dismiss all"
          onPress={() => {
            dismissAllCues();
            onClose();
          }}
          style={styles.dismissAll}
        />
      ) : null}
    </BottomSheet>
  );
}

function CueRow({ cue }: { cue: Cue }) {
  const { colors } = useTheme();
  const Icon = CUE_ICON[cue.kind];

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
      <Icon size={18} color={cueTint(cue.kind, colors)} />
      <View style={styles.rowContent}>
        <Text variant="body" numberOfLines={2}>
          {cue.title}
        </Text>
        {cue.description ? (
          <Text variant="caption" color="secondary" numberOfLines={3}>
            {cue.description}
          </Text>
        ) : null}
        {cue.actions?.length ? (
          <View style={styles.rowActions}>
            {cue.actions.map((action, index) => (
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
        onPress={() => dismissCue(cue.id)}
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

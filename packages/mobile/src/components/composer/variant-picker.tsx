import { FlatList, StyleSheet, TouchableOpacity } from "react-native";
import CircleCheck from "lucide-react-native/icons/circle-check";
import { BottomSheet, Text } from "@/components/primitives";
import { borderRadius, spacing, useTheme } from "@/theme";

export function VariantPicker({
  visible,
  onClose,
  baseName,
  variants,
  currentVariant,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  baseName: string;
  variants: string[];
  currentVariant?: string;
  onSelect: (variant: string | undefined) => void;
}) {
  const { colors } = useTheme();

  const rows: { key: string; label: string; variant: string | undefined }[] = [
    { key: "", label: `${baseName} (default)`, variant: undefined },
    ...variants.map((variant) => ({ key: variant, label: variant, variant })),
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Choose variant · ${baseName}`}
      snapPoints={["50%", "90%"]}
      fillContent
    >
      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        style={styles.list}
        renderItem={({ item }) => {
          const selected = (item.variant ?? "") === (currentVariant ?? "");
          return (
            <TouchableOpacity
              onPress={() => {
                onSelect(item.variant);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.row,
                {
                  backgroundColor: colors.background.surface,
                  borderColor: colors.border.default,
                },
              ]}
            >
              <Text variant="body" numberOfLines={1} style={styles.rowLabel}>
                {item.label}
              </Text>
              {selected ? (
                <CircleCheck size={18} color={colors.action.primary} />
              ) : null}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.listContent}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  rowLabel: {
    flex: 1,
  },
});

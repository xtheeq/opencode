import { useEffect, useState } from "react";
import { SectionList, StyleSheet, TouchableOpacity } from "react-native";
import CircleCheck from "lucide-react-native/icons/circle-check";
import { BottomSheet, Text, TextInput } from "@/components/primitives";
import { borderRadius, spacing, useTheme } from "@/theme";
import type { ModelSelection } from "@/types/composer";
import {
  filterModelSections,
  modelSelectionKey,
  type ModelSection,
} from "@/utils/composer-pickers";

export function ModelPicker({
  visible,
  onClose,
  sections,
  currentKey,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  sections: ModelSection[];
  currentKey?: string;
  onSelect: (model: ModelSelection) => void;
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (visible) setQuery("");
  }, [visible]);

  const filtered = filterModelSections(sections, query);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Choose model"
      snapPoints={["50%", "90%"]}
      fillContent
    >
      {sections.length > 0 ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search models"
          style={styles.search}
        />
      ) : null}
      <SectionList
        sections={filtered}
        keyExtractor={(item) => modelSelectionKey(item)}
        style={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text
            variant="caption"
            color="secondary"
            style={styles.sectionHeader}
          >
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          const selected = modelSelectionKey(item) === currentKey;
          return (
            <TouchableOpacity
              onPress={() => {
                onSelect({
                  providerID: item.providerID,
                  modelID: item.modelID,
                });
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
                {item.name}
              </Text>
              {selected ? (
                <CircleCheck size={18} color={colors.action.primary} />
              ) : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text variant="caption" color="secondary" style={styles.empty}>
            {sections.length > 0 ? "No matching models" : "No models available"}
          </Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  search: {
    marginBottom: spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  sectionHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
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
  empty: {
    textAlign: "center",
    padding: spacing.lg,
  },
});

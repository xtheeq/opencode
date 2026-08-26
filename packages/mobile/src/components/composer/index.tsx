import { useState } from "react";
import {
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import Square from "lucide-react-native/icons/square";
import X from "lucide-react-native/icons/x";
import { Text } from "@/components/primitives";
import { useComposer } from "@/hooks/use-composer";
import { raiseCue } from "@/stores/cues";
import { borderRadius, spacing, typography, useTheme } from "@/theme";
import type { AgentPart, FilePart, ModelSelection } from "@/types/composer";
import { modelSelectionKey } from "@/utils/composer-pickers";
import { ModelPicker } from "./model-picker";
import { SuggestionSheet } from "./suggestion-sheet";
import { VariantPicker } from "./variant-picker";

export function Composer({
  sessionID,
  onSubmitted,
}: {
  sessionID: string;
  onSubmitted?: (sessionID: string) => void;
}) {
  const {
    text,
    parts,
    canSubmit,
    working,
    interaction,
    suggestions,
    model,
    modelName,
    sections,
    variantsFor,
    modelNameOf,
    setModel,
    onChangeText,
    onCursor,
    select,
    submit,
    stop,
    removeMention,
  } = useComposer(sessionID);
  const { colors, effects } = useTheme();
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [variantPickerOpen, setVariantPickerOpen] = useState(false);

  const popover = interaction.popover;
  const sheetOpen = popover.type !== "closed";
  const emptyText =
    popover.type === "context" ? "No matching context" : "No matching commands";

  const handleSubmit = async () => {
    if (working) {
      await stop();
      return;
    }
    if (!canSubmit) return;
    try {
      const result = await submit();
      onSubmitted?.(result.sessionID);
    } catch (error) {
      raiseCue({
        kind: "error",
        title: "Failed to send",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const buttonBackground =
    working || canSubmit ? colors.action.primary : colors.action.disabled;
  const buttonIconColor =
    working || canSubmit ? colors.action.primaryText : colors.icon.muted;

  const currentBase = model;
  const currentVariants = currentBase ? (variantsFor(currentBase) ?? []) : [];
  const showVariantControl = currentVariants.length > 0;

  const handleModelSelect = (next: ModelSelection) => {
    const preserved =
      model && modelSelectionKey(model) === modelSelectionKey(next)
        ? (model.variant ?? undefined)
        : undefined;
    setModel({ ...next, variant: preserved });
  };

  const handleVariantSelect = (variant: string | undefined) => {
    if (currentBase) setModel({ ...currentBase, variant });
    setVariantPickerOpen(false);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.default }]}
      pointerEvents="box-none"
    >
      {sheetOpen && (
        <SuggestionSheet
          suggestions={suggestions}
          onSelect={select}
          emptyText={emptyText}
        />
      )}
      {parts.some((part) => part.type !== "text") && (
        <View style={styles.chips} pointerEvents="box-none">
          {parts.map((part, index) => {
            if (part.type === "text") return null;
            const label = chipLabel(part);
            return (
              <View
                key={index}
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.background.elevated,
                    borderColor: colors.border.default,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  numberOfLines={1}
                  style={styles.chipLabel}
                >
                  {label}
                </Text>
                <TouchableOpacity
                  onPress={() => removeMention(index)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${label}`}
                >
                  <X size={12} color={colors.icon.muted} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
      <View
        style={[
          styles.shell,
          {
            backgroundColor: colors.background.surface,
            borderColor: colors.border.default,
            ...effects.elevation.raised,
          },
        ]}
      >
        <RNTextInput
          style={[
            styles.input,
            typography.body,
            { color: colors.text.primary },
          ]}
          placeholder="Message..."
          placeholderTextColor={colors.text.secondary}
          value={text}
          onChangeText={(value) => onChangeText(value)}
          onSelectionChange={(event) =>
            onCursor(event.nativeEvent.selection.end)
          }
          multiline
          textAlignVertical="center"
        />
        <View style={styles.toolbar}>
          <View style={styles.toolbarLeading}>
            <TouchableOpacity
              onPress={() => setModelPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Choose model"
              style={[
                styles.modelButton,
                { borderColor: colors.border.subtle },
              ]}
            >
              <Text
                variant="label"
                numberOfLines={1}
                style={styles.modelButtonLabel}
              >
                {modelName ?? "Model"}
              </Text>
              <ChevronDown size={14} color={colors.icon.muted} />
            </TouchableOpacity>
            {showVariantControl ? (
              <TouchableOpacity
                onPress={() => setVariantPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Choose variant"
                style={[
                  styles.modelButton,
                  { borderColor: colors.border.subtle },
                ]}
              >
                <Text
                  variant="label"
                  numberOfLines={1}
                  style={styles.modelButtonLabel}
                >
                  {model?.variant ?? "Default"}
                </Text>
                <ChevronDown size={14} color={colors.icon.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: buttonBackground }]}
            onPress={handleSubmit}
            disabled={!working && !canSubmit}
            accessibilityRole="button"
            accessibilityLabel={working ? "Stop" : "Send"}
          >
            {working ? (
              <Square size={18} color={colors.action.primaryText} />
            ) : (
              <ArrowUp size={18} color={buttonIconColor} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <ModelPicker
        visible={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
        sections={sections}
        currentKey={model ? modelSelectionKey(model) : undefined}
        onSelect={handleModelSelect}
      />
      <VariantPicker
        visible={variantPickerOpen}
        onClose={() => setVariantPickerOpen(false)}
        baseName={currentBase ? modelNameOf(currentBase) : ""}
        variants={currentVariants}
        currentVariant={currentBase?.variant ?? undefined}
        onSelect={handleVariantSelect}
      />
    </View>
  );
}

function chipLabel(part: FilePart | AgentPart): string {
  if (part.type === "agent") return part.name;
  return part.filename ?? part.path;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    maxWidth: "80%",
  },
  chipLabel: {
    flexShrink: 1,
  },
  shell: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  input: {
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    maxHeight: typography.body.lineHeight * 5,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  toolbarLeading: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  modelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    maxWidth: "100%",
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  modelButtonLabel: {
    flexShrink: 1,
  },
  sendButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.pill,
    justifyContent: "center",
    alignItems: "center",
  },
});

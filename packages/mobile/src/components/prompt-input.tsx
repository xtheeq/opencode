import { useState, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
} from "react-native";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import { spacing, borderRadius, typography, useTheme } from "@/theme";
import { getClient } from "@/services/api";

export function PromptInput({
  sessionID,
  onSubmit,
  placeholder = "Message...",
}: {
  sessionID?: string;
  onSubmit?: (text: string) => Promise<void>;
  placeholder?: string;
}) {
  const { colors, effects } = useTheme();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const captured = trimmed;
    setText("");
    try {
      if (onSubmit) {
        await onSubmit(captured);
      } else if (sessionID) {
        await getClient().session.prompt({
          sessionID,
          text: captured,
          delivery: "steer",
        });
      }
    } catch {
      setText(captured);
    } finally {
      setSending(false);
    }
  }, [text, sending, sessionID, onSubmit]);

  const canSend = text.trim().length > 0 && !sending;

  const isActive = canSend || sending;
  const buttonBg = isActive
    ? colors.action.primary
    : colors.action.disabled;
  const iconColor = isActive
    ? colors.action.primaryText
    : colors.icon.muted;

  return (
    <View style={[styles.container, { backgroundColor: colors.background.default }]}>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.background.surface,
            borderColor: colors.border.default,
            ...effects.elevation.raised,
          },
        ]}
      >
        <TextInput
          style={[styles.input, typography.body, { color: colors.text.primary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.text.secondary}
          value={text}
          onChangeText={(v) => {
            if (!sending) setText(v);
          }}
          multiline
          editable={!sending}
          textAlignVertical="center"
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: buttonBg }]}
          onPress={handleSubmit}
          disabled={!canSend}
        >
          {sending ? (
              <ActivityIndicator size="small" color={colors.action.primaryText} />
          ) : (
            <ArrowUp size={18} color={iconColor} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    padding: spacing.xs,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    maxHeight: typography.body.lineHeight * 5,
  },
  sendButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.pill,
    justifyContent: "center",
    alignItems: "center",
  },
});

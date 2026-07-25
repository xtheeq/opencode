import { useState, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/primitives";
import { spacing, borderRadius, typography, useTheme } from "@/theme";
import { getClient } from "@/services/api";

export function PromptInput({
  sessionID,
  placeholder = "Message...",
}: {
  sessionID: string;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const captured = trimmed;
    setText("");
    try {
      await getClient().session.prompt({
        sessionID,
        text: captured,
        delivery: "steer",
      });
    } catch {
      setText(captured);
    } finally {
      setSending(false);
    }
  }, [text, sending, sessionID]);

  const canSend = text.trim().length > 0 && !sending;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderTopColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[styles.inputWrapper, { backgroundColor: colors.background }]}
        >
          <TextInput
            style={[styles.input, typography.body, { color: colors.text }]}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            value={text}
            onChangeText={(v) => {
              if (!sending) setText(v);
            }}
            multiline
            editable={!sending}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? colors.primary : colors.border },
          ]}
          onPress={handleSubmit}
          disabled={!canSend}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={[styles.sendIcon, { color: colors.onPrimary }]}>
              ↑
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
  },
  input: {
    paddingVertical: spacing.md,
    maxHeight: typography.body.lineHeight * 5,
  },
  sendButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  sendIcon: {
    ...typography.heading,
  },
});

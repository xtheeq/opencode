import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { PermissionRequest } from "@opencode-ai/client/promise";
import { Button, Text, TextInput } from "@/components/primitives";
import { useAutoApprove } from "@/hooks/use-auto-approve";
import { useSessionMessagesRaw } from "@/hooks/use-store";
import { replyPermission } from "@/services/blocker-reply";
import { resolvePermissionTool } from "@/stores/store";
import { borderRadius, spacing, useTheme } from "@/theme";
import {
  createPermissionBodyState,
  permissionAlwaysLines,
  permissionCancel,
  permissionInfo,
  permissionLabel,
  permissionOptions,
  permissionReject,
  permissionRun,
  permissionSetError,
  permissionSetSubmitting,
  type PermissionBodyState,
  type PermissionOption,
  type PermissionReplyValue,
} from "@/utils/permission-state";

export function PermissionCard({ request }: { request: PermissionRequest }) {
  const { colors } = useTheme();
  const { enabled: autoApproved, toggle: toggleAutoApprove } = useAutoApprove(
    request.sessionID,
  );
  const messages = useSessionMessagesRaw(request.sessionID);
  const tool = resolvePermissionTool(messages, request);
  const info = permissionInfo({ ...request, tool });
  const [state, setState] = useState(() => createPermissionBodyState(request));
  const options = permissionOptions(state.stage);

  const apply = (next: PermissionBodyState) => setState(next);

  const submit = async (reply: PermissionReplyValue) => {
    apply(permissionSetSubmitting(state, true));
    try {
      await replyPermission(reply);
    } catch (error) {
      apply(
        permissionSetError(
          state,
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  };

  const run = (option: PermissionOption) => {
    const step = permissionRun(state, request.id, option);
    apply(step.state);
    if (step.reply) void submit(step.reply);
  };

  const reject = () => {
    const reply = permissionReject(state, request.id);
    if (reply) void submit(reply);
  };

  if (state.stage === "always") {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.background.surface,
            borderColor: colors.border.default,
          },
        ]}
      >
        <Text variant="heading" color="warning">
          Always allow?
        </Text>
        <Text color="secondary">
          {permissionAlwaysLines(request).join("\n")}
        </Text>
        <View style={styles.row}>
          <Button
            title={permissionLabel("cancel")}
            style={styles.secondary}
            onPress={() => apply(permissionCancel(state))}
            disabled={state.submitting}
          />
          <Button
            title={permissionLabel("confirm")}
            loading={state.submitting}
            onPress={() => run("confirm")}
          />
        </View>
      </View>
    );
  }

  if (state.stage === "reject") {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.background.surface,
            borderColor: colors.border.default,
          },
        ]}
      >
        <Text variant="heading" color="error">
          Reject permission
        </Text>
        <Text color="secondary">Tell OpenCode what to do differently</Text>
        <TextInput
          multiline
          value={state.message}
          onChangeText={(message) => apply({ ...state, message })}
          placeholder="Rejection reason"
        />
        <View style={styles.row}>
          <Button
            title={permissionLabel("cancel")}
            style={styles.secondary}
            onPress={() => apply(permissionCancel(state))}
            disabled={state.submitting}
          />
          <Button
            title={permissionLabel("reject")}
            loading={state.submitting}
            onPress={reject}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background.surface,
          borderColor: colors.border.default,
        },
      ]}
    >
      <View style={styles.header}>
        <Text variant="heading">{info.icon} Permission required</Text>
        <Text color="secondary">{info.title}</Text>
      </View>
      {info.lines.length > 0 && (
        <View style={styles.lines}>
          {info.lines.map((line, index) => (
            <Text key={index} variant="caption" color="secondary">
              {line}
            </Text>
          ))}
        </View>
      )}
      <View style={styles.row}>
        {options.map((option, index) => (
          <Button
            key={option}
            title={permissionLabel(option)}
            style={index < options.length - 1 ? styles.secondary : undefined}
            loading={state.submitting && index === options.length - 1}
            disabled={state.submitting}
            onPress={() => run(option)}
          />
        ))}
      </View>
      <Pressable onPress={toggleAutoApprove} disabled={state.submitting}>
        <Text variant="caption" color="secondary">
          {autoApproved
            ? "✓ Auto-approving this session"
            : "Auto-approve this session"}
        </Text>
      </Pressable>
      {state.error ? (
        <Text variant="caption" color="error">
          {state.error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  lines: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  secondary: {
    flex: 1,
  },
});

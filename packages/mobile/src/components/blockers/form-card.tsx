import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "@/components/primitives";
import { cancelForm, replyForm } from "@/services/blocker-reply";
import type { FormWithLocation } from "@/stores/store";
import { borderRadius, spacing, useTheme } from "@/theme";
import {
  createFormBodyState,
  formAcknowledge,
  formCommitInput,
  formConfirm,
  formCurrent,
  formCustom,
  formInput,
  formLabel,
  formPick,
  formPlaceholder,
  formReply,
  formRows,
  formSetDraft,
  formSetError,
  formSetExternalReady,
  formSetField,
  formSetSelected,
  formSetSubmitting,
  formSingle,
  formTextual,
  formValidate,
  type FormBodyState,
} from "@/utils/form-state";
import { formDisplayValue } from "@/utils/form";

export function FormCard({ form }: { form: FormWithLocation }) {
  const { colors } = useTheme();
  const [state, setState] = useState(() => createFormBodyState(form));
  const field = formCurrent(form, state);
  const confirm = formConfirm(form, state);
  const single = formSingle(form);
  const rows = formRows(field);
  const textual = formTextual(field);
  const custom = formCustom(field);
  const multi = field?.type === "multiselect";
  const external = field?.type === "external" ? field : undefined;
  const answered = form.fields.filter(
    (item) => state.answers[item.key] !== undefined,
  ).length;

  const apply = (next: FormBodyState) => setState(next);

  const errorText = (error: unknown) =>
    error instanceof Error ? error.message : String(error);

  const submit = async (next = state) => {
    const invalid = formValidate(form, next);
    if (invalid) {
      apply(formSetError(next, invalid));
      return;
    }
    const reply = formReply(form, next);
    if (!reply) return;
    apply(formSetSubmitting(next, true));
    try {
      await replyForm(form, reply.answer);
    } catch (error) {
      apply(formSetError(next, errorText(error)));
    }
  };

  const cancel = () => {
    apply(formSetSubmitting(state, true));
    void cancelForm(form).catch((error) =>
      apply(formSetError(state, errorText(error))),
    );
  };

  const openExternal = async () => {
    if (!external) return;
    try {
      await Linking.openURL(external.url);
      apply(formSetExternalReady(state, external.key));
    } catch {
      apply(formSetError(state, "Could not open the URL"));
    }
  };

  const pick = (index: number) => {
    const next = formPick(formSetSelected(state, index), form);
    apply(next);
    if (single) void submit(next);
  };

  const commit = (text: string) => {
    const next = formCommitInput(state, form, text);
    apply(next);
    if (next.error) return;
    if (single) {
      void submit(next);
      return;
    }
    if (next.field < form.fields.length)
      apply(formSetField(next, form, next.field + 1));
  };

  const acknowledge = () => {
    const next = formAcknowledge(state, form);
    if (next !== state) {
      apply(next);
      if (formConfirm(form, next)) void submit(next);
      return;
    }
    void openExternal();
  };

  const next = () => {
    if (external) {
      acknowledge();
      return;
    }
    if (single) {
      if (state.editing) {
        commit(formInput(state, field));
        return;
      }
      void submit();
      return;
    }
    if (confirm) {
      void submit();
      return;
    }
    if (state.editing) {
      commit(formInput(state, field));
      return;
    }
    apply(formSetField(state, form, state.field + 1));
  };

  const back = () => {
    if (state.field <= 0) return;
    apply(formSetField(state, form, state.field - 1));
  };

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
        <Text variant="heading">{form.title}</Text>
        {!single && (
          <Text variant="caption" color="secondary">
            {confirm
              ? "Review"
              : `Field ${state.field + 1} of ${form.fields.length}`}{" "}
            · {answered}/{form.fields.length} answered
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.bodyScroll}
        showsVerticalScrollIndicator={false}
      >
        {confirm ? (
          <View style={styles.lines}>
            {form.fields.map((item) => {
              const value =
                item.type === "external" ? undefined : state.answers[item.key];
              const missing =
                item.type !== "external" &&
                item.required === true &&
                value === undefined;
              return (
                <Text
                  key={item.key}
                  variant="caption"
                  color={missing ? "error" : "secondary"}
                >
                  {formLabel(item)}:{" "}
                  {item.type === "external"
                    ? state.answers[item.key] === true
                      ? "Acknowledged"
                      : "(acknowledgement required)"
                    : value === undefined
                      ? missing
                        ? "(required)"
                        : "(not answered)"
                      : formDisplayValue(item, value, "(none)")}
                </Text>
              );
            })}
          </View>
        ) : external ? (
          <View style={styles.lines}>
            <Text color="secondary">{external.title ?? external.key}</Text>
            {external.description ? (
              <Text variant="caption" color="secondary">
                {external.description}
              </Text>
            ) : null}
            <Pressable onPress={openExternal} disabled={state.submitting}>
              <Text variant="caption" color="accent">
                {external.url}
              </Text>
            </Pressable>
              <Text variant="caption" color="secondary">
              {state.answers[external.key] === true
                ? "✓ Acknowledged"
                : state.externalReady[external.key]
                  ? "Complete the action, then confirm."
                  : "Open the link to continue."}
            </Text>
          </View>
        ) : (
          <View style={styles.lines}>
            <Text color="secondary">
              {field?.description ?? formLabel(field)}
            </Text>
            {textual ? (
              <TextInput
                multiline
                autoFocus
                value={formInput(state, field)}
                onChangeText={(text) => apply(formSetDraft(state, field, text))}
                placeholder={formPlaceholder(field)}
                editable={!state.submitting}
              />
            ) : state.editing ? (
              <TextInput
                multiline
                autoFocus
                value={formInput(state, field)}
                onChangeText={(text) => apply(formSetDraft(state, field, text))}
                placeholder="Type your own answer"
                editable={!state.submitting}
              />
            ) : (
              <View style={styles.lines}>
                {rows.map((row, index) => {
                  const value = state.answers[field!.key];
                  const picked = multi
                    ? Array.isArray(value) && value.includes(String(row.value))
                    : value === row.value;
                  return (
                    <Pressable
                      key={index}
                      accessibilityRole={multi ? "checkbox" : "radio"}
                      accessibilityState={{
                        checked: picked,
                        disabled: state.submitting,
                      }}
                      onPress={() => pick(index)}
                      disabled={state.submitting}
                    >
                      <Text
                        variant="caption"
                        color={picked ? "primary" : "secondary"}
                      >
                        {multi ? `[${picked ? "✓" : " "}] ` : `${index + 1}. `}
                        {row.label}
                      </Text>
                      {row.description ? (
                        <Text variant="caption" color="secondary">
                          {row.description}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
                {custom && (
                  <Pressable
                    accessibilityRole={multi ? "checkbox" : "radio"}
                    accessibilityState={{
                      checked: state.selected === rows.length,
                      disabled: state.submitting,
                    }}
                    onPress={() => pick(rows.length)}
                    disabled={state.submitting}
                  >
                    <Text
                      variant="caption"
                      color={
                        state.selected === rows.length
                          ? "primary"
                          : "secondary"
                      }
                    >
                      {multi ? "[ ] " : `${rows.length + 1}. `}Type your own
                      answer
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {state.error ? (
        <Text variant="caption" color="error">
          {state.error}
        </Text>
      ) : null}

      <View style={styles.row}>
        {!single && state.field > 0 && (
          <Button
            title="Back"
            style={styles.secondary}
            disabled={state.submitting}
            onPress={back}
          />
        )}
        <Button
          title={single || confirm ? "Submit" : "Next"}
          style={styles.primary}
          loading={state.submitting}
          onPress={next}
        />
        <Button
          title="Dismiss"
          style={styles.secondary}
          disabled={state.submitting}
          onPress={cancel}
        />
      </View>
    </View>
  );
}

const FORM_BODY_MAX_HEIGHT = 300;

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
  bodyScroll: {
    maxHeight: FORM_BODY_MAX_HEIGHT,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  primary: {
    flex: 2,
  },
  secondary: {
    flex: 1,
  },
});

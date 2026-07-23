import {
  StyleSheet,
  TextInput as RNTextInput,
  type TextInputProps,
} from "react-native";
import { borderRadius, spacing, typography, useTheme } from "@/theme";

export function TextInput({ style, ...props }: TextInputProps) {
  const { colors } = useTheme();
  return (
    <RNTextInput
      style={[
        styles.base,
        typography.body,
        {
          color: colors.text,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        style,
      ]}
      placeholderTextColor={colors.textSecondary}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
});

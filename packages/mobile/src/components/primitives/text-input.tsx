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
          color: colors.text.primary,
          borderColor: colors.border.default,
          backgroundColor: colors.background.surface,
        },
        style,
      ]}
      placeholderTextColor={colors.text.secondary}
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

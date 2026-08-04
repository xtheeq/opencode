import {
  ActivityIndicator,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  type TouchableOpacityProps,
} from "react-native";
import { borderRadius, spacing, typography, useTheme } from "@/theme";

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
}

export function Button({
  title,
  loading,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: colors.action.primary,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      disabled={disabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.action.primaryText} />
      ) : (
        <RNText style={[styles.text, { color: colors.action.primaryText }]}>
          {title}
        </RNText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  text: {
    ...typography.body,
    fontWeight: "600",
  },
});

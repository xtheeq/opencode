import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { typography, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type TypographyKey = keyof typeof typography;

export interface TextProps extends RNTextProps {
  variant?: TypographyKey;
  color?: keyof ThemeColors["text"];
}

export function Text({
  variant = "body",
  color = "primary",
  style,
  ...props
}: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      style={[typography[variant], { color: colors.text[color] }, style]}
      {...props}
    />
  );
}

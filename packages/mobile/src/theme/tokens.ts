import type { TextStyle } from "react-native";

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  onPrimary: string;
  success: string;
  warning: string;
  error: string;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  pill: 9999,
} as const;

export const typography = {
  title: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
  } satisfies TextStyle,
  heading: {
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 32,
  } satisfies TextStyle,
  body: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  } satisfies TextStyle,
  caption: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  } satisfies TextStyle,
  mono: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    fontFamily: "monospace",
  } satisfies TextStyle,
} as const;

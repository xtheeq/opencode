import type { TextStyle } from "react-native";

export interface ThemeColors {
  text: {
    primary: string;
    secondary: string;
    muted: string;
    accent: string;
    disabled: string;
    inverse: string;
    onMedia: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  background: {
    default: string;
    surface: string;
    elevated: string;
    subtle: string;
    inset: string;
    inverse: string;
    contrast: string;
    accent: string;
    media: string;
  };
  border: {
    default: string;
    strong: string;
    subtle: string;
    focus: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
  icon: {
    default: string;
    accent: string;
    muted: string;
    inverse: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  action: {
    primary: string;
    primaryHover: string;
    primaryPressed: string;
    primaryText: string;
    secondary: string;
    secondaryHover: string;
    secondaryPressed: string;
    destructive: string;
    disabled: string;
  };
  status: {
    success: string;
    successBackground: string;
    warning: string;
    warningBackground: string;
    error: string;
    errorBackground: string;
    info: string;
    infoBackground: string;
  };
}

export interface ThemeElevation {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
}

export interface ThemeEffects {
  elevation: {
    raised: ThemeElevation;
    floating: ThemeElevation;
    overlay: ThemeElevation;
    element: ThemeElevation;
  };
  overlay: {
    hover: string;
    pressed: string;
    scrim: string;
    focus: string;
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  xxl: 16,
  pill: 9999,
} as const;

export const typography = {
  title: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 36,
  } satisfies TextStyle,
  heading: {
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 32,
  } satisfies TextStyle,
  body: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
    letterSpacing: -0.05,
  } satisfies TextStyle,
  label: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
    letterSpacing: -0.04,
  } satisfies TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 18,
  } satisfies TextStyle,
  mono: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 20,
    fontFamily: "monospace",
    fontVariant: ["tabular-nums"],
  } satisfies TextStyle,
} as const;

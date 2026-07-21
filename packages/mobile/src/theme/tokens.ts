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
  running: string;
}

export const lightColors: ThemeColors = {
  background: "#FFFFFF",
  surface: "#F2F2F7",
  text: "#000000",
  textSecondary: "#3C3C43",
  border: "#C6C6C8",
  primary: "#007AFF",
  onPrimary: "#FFFFFF",
  success: "#34C759",
  warning: "#FF9500",
  error: "#FF3B30",
  running: "#007AFF",
};

export const darkColors: ThemeColors = {
  background: "#000000",
  surface: "#1C1C1E",
  text: "#FFFFFF",
  textSecondary: "#8E8E93",
  border: "#38383A",
  primary: "#0A84FF",
  onPrimary: "#FFFFFF",
  success: "#30D158",
  warning: "#FF9F0A",
  error: "#FF453A",
  running: "#0A84FF",
};

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
} as const;

export const typography = {
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    lineHeight: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: "600" as const,
    lineHeight: 32,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
} as const;

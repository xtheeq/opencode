import { createContext, useContext, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import {
  spacing,
  typography,
  type ThemeColors,
  type ThemeEffects,
} from "./tokens";
import { darkColors, lightColors } from "./palettes";

export type { ThemeColors } from "./tokens";
export { borderRadius, spacing, typography } from "./tokens";

export interface Theme {
  colors: ThemeColors;
  effects: ThemeEffects;
  isDark: boolean;
}

const effects: ThemeEffects = {
  elevation: {
    raised: {
      shadowColor: "#000000",
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    floating: {
      shadowColor: "#000000",
      shadowOpacity: 0.14,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 5,
    },
    overlay: {
      shadowColor: "#000000",
      shadowOpacity: 0.2,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    element: {
      shadowColor: "#000000",
      shadowOpacity: 0.12,
      shadowRadius: 1,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
  },
  overlay: {
    hover: "#0000000a",
    pressed: "#00000014",
    scrim: "#00000066",
    focus: "#7698fd",
  },
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme: Theme = { colors: isDark ? darkColors : lightColors, effects, isDark };

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

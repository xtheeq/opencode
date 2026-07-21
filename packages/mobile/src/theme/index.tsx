import { createContext, type ReactNode, useContext, useMemo } from "react"
import { useColorScheme } from "react-native"
import { darkColors, lightColors, spacing, typography, type ThemeColors } from "./tokens"

export type { ThemeColors } from "./tokens"
export { spacing, typography } from "./tokens"

export interface Theme {
  colors: ThemeColors
  isDark: boolean
}

const ThemeContext = createContext<Theme | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme()
  const theme = useMemo<Theme>(() => {
    const isDark = scheme === "dark"
    return { colors: isDark ? darkColors : lightColors, isDark }
  }, [scheme])

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}

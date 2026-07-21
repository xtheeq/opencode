import { Slot } from "expo-router";
import { ThemeProvider } from "@/theme";
import { ConnectionProvider } from "@/services/connection";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ConnectionProvider>
        <Slot />
      </ConnectionProvider>
    </ThemeProvider>
  );
}

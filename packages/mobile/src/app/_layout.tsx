import { Slot } from "expo-router";
import { ThemeProvider } from "@/theme";
import { ConnectionProvider } from "@/services/connection";
import { ErrorBoundary } from "@/components/error-boundary";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ConnectionProvider>
          <Slot />
        </ConnectionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

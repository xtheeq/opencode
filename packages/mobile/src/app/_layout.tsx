import { Slot } from "expo-router";
import { ThemeProvider } from "@/theme";
import { ConnectionProvider } from "@/services/connection";
import { ErrorBoundary } from "@/components/error-boundary";
import { QueryProvider } from "@/app/query-provider";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <ConnectionProvider>
            <Slot />
          </ConnectionProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

import { Slot } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider } from "@/theme";
import { ConnectionProvider } from "@/services/connection";
import { ErrorBoundary } from "@/components/error-boundary";
import { QueryProvider } from "@/providers/query-provider";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <ConnectionProvider>
            <SafeAreaView style={{ flex: 1 }}>
              <Slot />
            </SafeAreaView>
          </ConnectionProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

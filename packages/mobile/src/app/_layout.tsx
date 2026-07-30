import { Slot } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider } from "@/theme";
import { ConnectionProvider } from "@/services/connection";
import { ErrorBoundary } from "@/components/error-boundary";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ConnectionProvider>
          <SafeAreaView style={{ flex: 1 }}>
            <Slot />
          </SafeAreaView>
        </ConnectionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

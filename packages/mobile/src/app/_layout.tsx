import { Slot } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ThemeProvider } from "@/theme";
import { ConnectionProvider } from "@/services/connection";
import { ErrorBoundary } from "@/components/error-boundary";

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ConnectionProvider>
          <KeyboardProvider>
            <SafeAreaView style={{ flex: 1 }}>
              <Slot />
            </SafeAreaView>
          </KeyboardProvider>
        </ConnectionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

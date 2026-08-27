import { useEffect } from "react";
import { SplashScreen, Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "@/theme";
import { ConnectionManager } from "@/services/connection";
import { useConnectionPhase } from "@/hooks/use-store";
import { ErrorBoundary } from "@/components/error-boundary";

SplashScreen.preventAutoHideAsync();

function SplashScreenController() {
  const phase = useConnectionPhase();
  useEffect(() => {
    if (phase !== "loading") SplashScreen.hide();
  }, [phase]);
  return null;
}

function RootNavigator() {
  const { colors } = useTheme();
  const phase = useConnectionPhase();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <Stack.Protected guard={phase === "ready"}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={phase !== "ready"}>
        <Stack.Screen name="connect" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ConnectionManager>
          <KeyboardProvider>
            <SplashScreenController />
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaView style={{ flex: 1 }}>
                <RootNavigator />
              </SafeAreaView>
            </GestureHandlerRootView>
          </KeyboardProvider>
        </ConnectionManager>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

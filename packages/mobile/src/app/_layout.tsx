import { useEffect } from "react";
import { SplashScreen, Stack } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "@/theme";
import { ConnectionManager } from "@/services/connection";
import { useConnectionState } from "@/hooks/use-store";
import { ErrorBoundary } from "@/components/error-boundary";

SplashScreen.preventAutoHideAsync();

function SplashScreenController() {
  const status = useConnectionState();
  useEffect(() => {
    if (status !== "loading") SplashScreen.hide();
  }, [status]);
  return null;
}

function RootNavigator() {
  const { colors } = useTheme();
  const status = useConnectionState();
  const appReady = status !== "idle" && status !== "loading";
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <Stack.Protected guard={appReady}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!appReady}>
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
            <SafeAreaView style={{ flex: 1 }}>
              <RootNavigator />
            </SafeAreaView>
          </KeyboardProvider>
        </ConnectionManager>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

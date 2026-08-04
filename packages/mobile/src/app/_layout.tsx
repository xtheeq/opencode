import { useEffect } from "react";
import { SplashScreen, Stack } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "@/theme";
import { ConnectionProvider, useConnection } from "@/services/connection";
import { ErrorBoundary } from "@/components/error-boundary";

SplashScreen.preventAutoHideAsync();

function SplashScreenController() {
  const { status } = useConnection();
  useEffect(() => {
    if (status !== "loading") SplashScreen.hide();
  }, [status]);
  return null;
}

function RootNavigator() {
  const { colors } = useTheme();
  const { status } = useConnection();
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
        <ConnectionProvider>
          <KeyboardProvider>
            <SplashScreenController />
            <SafeAreaView style={{ flex: 1 }}>
              <RootNavigator />
            </SafeAreaView>
          </KeyboardProvider>
        </ConnectionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

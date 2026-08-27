import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { SwipeMenuShell } from "@/components/swipe-menu-shell";
import { AppHeader } from "@/components/app-header";
import { Composer } from "@/components/composer";

// Reserved key for the "new session" composer on this screen. Real session ids
// are `ses_*`, so this cannot collide with an existing session. The location
// for the new session is the currently selected project (or the server default
// when none has been picked), set via the drawer.
const NEW_SESSION_KEY = "new";

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  function navigateToSession(sessionID: string) {
    router.push({ pathname: "/session/[id]", params: { id: sessionID } });
  }

  return (
    <SwipeMenuShell>
      <View
        style={[
          styles.connectedContainer,
          { backgroundColor: colors.background.default },
        ]}
      >
        <AppHeader />
        <View style={{ flex: 1 }} />
        <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
          <Composer
            sessionID={NEW_SESSION_KEY}
            onSubmitted={navigateToSession}
          />
        </KeyboardStickyView>
      </View>
    </SwipeMenuShell>
  );
}

const styles = StyleSheet.create({
  connectedContainer: {
    flex: 1,
  },
});

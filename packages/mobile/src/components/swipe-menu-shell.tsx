import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  BackHandler,
  Keyboard,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useFocusEffect } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import Animated from "react-native-reanimated";

import { type MenuSide } from "@/utils/swipe-menu";
import { useTheme } from "@/theme";
import { useSwipeMenu } from "@/hooks/use-swipe-menu";
import { BrowseView } from "@/components/browse-view";

export type MenuContextValue = {
  isMenuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within SwipeMenuShell");
  return ctx;
}

/**
 * Shared swipe session menu. Renders the animated menu layer underneath a
 * sliding main surface that carries the screen's children, so both the hamburger
 * (via `useMenu`) and a finger-swipe anywhere reveal the session list.
 *
 * The menu is a full-screen panel by default (`menuWidth` == screen width). The
 * `side` prop is RTL-aware, so a right-side variant is a one-line change.
 */
export function SwipeMenuShell({
  children,
  side = "left",
}: {
  children: ReactNode;
  side?: MenuSide;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const {
    animateMenu,
    isMenuOpen,
    mainAnimatedStyle,
    menuContentAnimatedStyle,
    menuDockAnimatedStyle,
    swipeGesture,
  } = useSwipeMenu({ menuWidth: width, side });

  const openMenu = useCallback(() => {
    Keyboard.dismiss();
    animateMenu(true);
  }, [animateMenu]);

  const closeMenu = useCallback(() => animateMenu(false), [animateMenu]);

  // Back closes the menu while it's open instead of leaving the screen.
  usePreventRemove(isMenuOpen, closeMenu);

  // Also consume Android hardware back on the root screen, where there is no
  // screen to pop so `usePreventRemove` does not fire.
  useFocusEffect(
    useCallback(() => {
      if (!isMenuOpen || Platform.OS !== "android") return undefined;

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          closeMenu();
          return true;
        },
      );
      return () => subscription.remove();
    }, [closeMenu, isMenuOpen]),
  );

  useEffect(() => {
    if (!isMenuOpen || Platform.OS !== "web") return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeMenu, isMenuOpen]);

  const wasOpenRef = useRef(isMenuOpen);
  useEffect(() => {
    if (wasOpenRef.current === isMenuOpen) return;

    wasOpenRef.current = isMenuOpen;
    AccessibilityInfo.announceForAccessibility(
      isMenuOpen ? "Sessions menu opened" : "Sessions menu closed",
    );
  }, [isMenuOpen]);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View
        accessibilityViewIsModal={isMenuOpen}
        style={[styles.root, { backgroundColor: colors.background.default }]}
      >
        {/* Session menu layer, revealed as the surface slides away. */}
        <View
          pointerEvents={isMenuOpen ? "auto" : "none"}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View
            accessible
            accessibilityLabel="Sessions"
            accessibilityRole="menu"
            accessibilityElementsHidden={!isMenuOpen}
            importantForAccessibility={
              isMenuOpen ? "auto" : "no-hide-descendants"
            }
            style={[styles.menu, menuContentAnimatedStyle]}
          >
            <BrowseView
              dockAnimatedStyle={menuDockAnimatedStyle}
              onClose={closeMenu}
            />
          </Animated.View>
        </View>

        {/* Main surface that slides to reveal the menu. */}
        <Animated.View
          accessibilityElementsHidden={isMenuOpen}
          importantForAccessibility={
            isMenuOpen ? "no-hide-descendants" : "auto"
          }
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.background.default },
            mainAnimatedStyle,
          ]}
        >
          <MenuContext.Provider value={{ isMenuOpen, openMenu, closeMenu }}>
            {children}
          </MenuContext.Provider>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  menu: {
    flex: 1,
  },
});

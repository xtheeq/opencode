import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { I18nManager } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { SWIPE_MENU, swipeDirection, type MenuSide } from "@/utils/swipe-menu";

export type SwipeMenuOptions = {
  menuWidth: number;
  side?: MenuSide;
};

type SwipeEndState = {
  currentPosition: number;
  menuWidth: number;
  translationX: number;
  velocityX: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  "worklet";

  return Math.min(maximum, Math.max(minimum, value));
}

/** Decide whether the swipe should settle open based on travel, velocity, and position. */
function shouldOpenMenu({
  currentPosition,
  menuWidth,
  translationX,
  velocityX,
}: SwipeEndState) {
  "worklet";

  const hasDirectionalIntent =
    Math.abs(translationX) > SWIPE_MENU.gesture.directionDistanceThreshold ||
    Math.abs(velocityX) > SWIPE_MENU.gesture.velocityThreshold;

  if (hasDirectionalIntent) {
    const projectedDirection =
      translationX + velocityX * SWIPE_MENU.gesture.velocityInfluence;

    return projectedDirection > 0;
  }

  return currentPosition > menuWidth * SWIPE_MENU.gesture.openPositionThreshold;
}

/**
 * Gesture + animation state for the swipe session menu. One shared value
 * (`translateX`, always a magnitude clamped within `[0, menuWidth]`) drives the
 * whole interplay: scrubbing selects it, a settlement spring commits it, and
 * derived styles reveal the menu body and slide the main surface. React only
 * hears about the terminal open/closed state via `runOnJS`.
 *
 * The hook is glance-agnostic: `side` (mirrored under RTL) only decides the
 * physical direction, so a right-side menu needs no gesture changes.
 */
export function useSwipeMenu({ menuWidth, side = "left" }: SwipeMenuOptions) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const translateX = useSharedValue(0);
  const gestureStartX = useSharedValue(0);
  const direction = swipeDirection(side, I18nManager.isRTL);
  const previousMenuWidth = useRef(menuWidth);

  const animateMenu = useCallback(
    (open: boolean) => {
      setIsMenuOpen(open);
      translateX.value = withSpring(open ? menuWidth : 0, SWIPE_MENU.spring);
    },
    [menuWidth, translateX],
  );

  useEffect(() => {
    if (previousMenuWidth.current === menuWidth) return;

    translateX.value = isMenuOpen ? menuWidth : 0;
    previousMenuWidth.current = menuWidth;
  }, [isMenuOpen, menuWidth, translateX]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([
          -SWIPE_MENU.gesture.activationDistance,
          SWIPE_MENU.gesture.activationDistance,
        ])
        .failOffsetY([
          -SWIPE_MENU.gesture.verticalTolerance,
          SWIPE_MENU.gesture.verticalTolerance,
        ])
        .onBegin(() => {
          gestureStartX.value = translateX.value;
        })
        .onUpdate((event) => {
          translateX.value = clamp(
            gestureStartX.value + direction * event.translationX,
            0,
            menuWidth,
          );
        })
        .onEnd((event) => {
          const open = shouldOpenMenu({
            currentPosition: translateX.value,
            menuWidth,
            translationX: direction * event.translationX,
            velocityX: direction * event.velocityX,
          });

          translateX.value = withSpring(
            open ? menuWidth : 0,
            SWIPE_MENU.spring,
          );

          runOnJS(setIsMenuOpen)(open);
        }),
    [direction, gestureStartX, menuWidth, translateX],
  );

  const mainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: direction * translateX.value }],
  }));

  const menuContentAnimatedStyle = useAnimatedStyle(() => {
    const progress = translateX.value / menuWidth;

    return {
      opacity: interpolate(
        progress,
        [
          0,
          SWIPE_MENU.reveal.fadeStartProgress,
          SWIPE_MENU.reveal.fadeEndProgress,
        ],
        [0, 0, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateY: interpolate(
            progress,
            [0, 1],
            [SWIPE_MENU.reveal.startVerticalOffset, 0],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            progress,
            [0, 1],
            [SWIPE_MENU.reveal.startScale, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return {
    animateMenu,
    isMenuOpen,
    mainAnimatedStyle,
    menuContentAnimatedStyle,
    swipeGesture,
  };
}

/** Logical anchor side for the swipe session menu. */
export type MenuSide = "left" | "right";

/**
 * All tuning knobs for the swipe session menu, kept in one place.
 * Values are magnitudes expressed relative to the anchored edge, so they hold
 * for both a left- and right-side menu.
 */
export const SWIPE_MENU = {
  gesture: {
    /** Horizontal travel required before the pan activates. */
    activationDistance: 8,
    /** Settlement uses this travel, along with velocity, to infer intent. */
    directionDistanceThreshold: 12,
    /** Fallback open threshold when the gesture ends without directional intent. */
    openPositionThreshold: 0.18,
    /** How much velocity contributes to the projected end position. */
    velocityInfluence: 0.05,
    /** Velocity above this signals directional intent. */
    velocityThreshold: 160,
    /** Vertical travel that fails the pan so vertical lists keep scrolling. */
    verticalTolerance: 18,
  },
  spring: {
    damping: 26,
    mass: 0.8,
    overshootClamping: true,
    stiffness: 220,
  },
  reveal: {
    fadeStartProgress: 0.08,
    fadeEndProgress: 0.5,
    startScale: 0.975,
    startVerticalOffset: 8,
  },
  minimumSafeAreaPadding: 16,
} as const;

/**
 * Resolve the physical slide direction for a glance: 1 moves the surface right
 * (menu pinned left), -1 moves it left (menu pinned right). Mirrors the side
 * under RTL so the menu stays on the "start" edge, matching the conventional
 * drawer placement.
 */
export function swipeDirection(side: MenuSide, isRTL: boolean): 1 | -1 {
  const physicalRight = (side === "right") !== isRTL;
  return physicalRight ? -1 : 1;
}

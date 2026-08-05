import type { ComponentType } from "react";
import Bell from "lucide-react-native/icons/bell";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import CircleCheck from "lucide-react-native/icons/circle-check";
import Info from "lucide-react-native/icons/info";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import type { SignalKind } from "@/types/signal";
import type { ThemeColors } from "@/theme/tokens";

export type SignalIcon = ComponentType<{ size?: number; color?: string }>;

export const SIGNAL_ICON: Record<SignalKind, SignalIcon> = {
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
  success: CircleCheck,
  custom: Bell,
};

export function signalTint(kind: SignalKind, colors: ThemeColors): string {
  switch (kind) {
    case "error":
      return colors.status.error;
    case "warning":
      return colors.status.warning;
    case "success":
      return colors.status.success;
    case "info":
      return colors.icon.info;
    case "custom":
      return colors.icon.default;
  }
}

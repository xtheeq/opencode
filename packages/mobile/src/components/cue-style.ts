import type { ComponentType } from "react";
import Bell from "lucide-react-native/icons/bell";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import CircleCheck from "lucide-react-native/icons/circle-check";
import Info from "lucide-react-native/icons/info";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import type { CueKind } from "@/types/cue";
import type { ThemeColors } from "@/theme/tokens";

export type CueIcon = ComponentType<{ size?: number; color?: string }>;

export const CUE_ICON: Record<CueKind, CueIcon> = {
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
  success: CircleCheck,
  custom: Bell,
};

export function cueTint(kind: CueKind, colors: ThemeColors): string {
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

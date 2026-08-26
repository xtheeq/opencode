import { Drawer } from "expo-router/drawer";
import { useWindowDimensions } from "react-native";
import { useTheme } from "@/theme";
import { SessionList } from "@/components/session-list";

export default function AppLayout() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  return (
    <Drawer
      drawerContent={SessionList}
      defaultStatus="closed"
      screenOptions={{
        headerShown: false,
        drawerType: "slide",
        drawerStyle: { width: "100%" },
        swipeEdgeWidth: width,
        sceneStyle: { backgroundColor: colors.background.default },
      }}
    />
  );
}

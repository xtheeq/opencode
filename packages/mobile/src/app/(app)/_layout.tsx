import { Drawer } from "expo-router/drawer";
import { useTheme } from "@/theme";
import { SessionList } from "@/components/session-list";

export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <Drawer
      drawerContent={SessionList}
      defaultStatus="closed"
      screenOptions={{
        headerShown: false,
        drawerType: "slide",
        drawerStyle: { width: "100%" },
        sceneStyle: { backgroundColor: colors.background.default },
      }}
    />
  );
}

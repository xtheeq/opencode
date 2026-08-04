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
        sceneStyle: { backgroundColor: colors.background.default },
      }}
    />
  );
}

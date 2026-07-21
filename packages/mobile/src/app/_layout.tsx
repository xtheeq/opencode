import { Slot } from "expo-router";
import { ConnectionProvider } from "@/services/connection";

export default function RootLayout() {
  return (
    <ConnectionProvider>
      <Slot />
    </ConnectionProvider>
  );
}

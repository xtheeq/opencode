import type { ConnectionPhase, ConnectionStatus } from "@/types/connection";

export function connectionPhase(state: {
  configLoaded: boolean;
  configured: boolean;
  status: ConnectionStatus;
  everConnected: boolean;
}): ConnectionPhase {
  if (!state.configLoaded) return "loading";
  if (!state.configured) return "connect";
  if (!state.everConnected && state.status !== "connected") return "connect";
  return "ready";
}

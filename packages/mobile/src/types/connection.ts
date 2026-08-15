export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected";

// The connect screen owns the lifecycle until a first connection succeeds;
// after that the app shell stays mounted and status is surfaced in-app.
export type ConnectionPhase = "loading" | "connect" | "ready";

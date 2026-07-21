import { createContext, type ReactNode, useContext } from "react";
import { useHealth, type HealthStatus } from "@/hooks/use-health";

interface ConnectionValue {
  status: HealthStatus;
}

const ConnectionContext = createContext<ConnectionValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const status = useHealth();
  return (
    <ConnectionContext.Provider value={{ status }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionValue {
  const ctx = useContext(ConnectionContext);
  if (!ctx)
    throw new Error("useConnection must be used within ConnectionProvider");
  return ctx;
}

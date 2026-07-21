import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { createClient } from "@/services/api";
import { useHealth, type HealthStatus } from "@/hooks/use-health";

interface ConnectionValue {
  status: HealthStatus;
  url: string;
  connect: (url: string) => void;
}

const ConnectionContext = createContext<ConnectionValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState("");
  const status = useHealth(url);

  const connect = useCallback((serverUrl: string) => {
    createClient(serverUrl);
    setUrl(serverUrl);
  }, []);

  return (
    <ConnectionContext.Provider value={{ status, url, connect }}>
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

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createClient } from "@/services/api";
import { useHealth, type HealthStatus } from "@/hooks/use-health";
import {
  getServerUrl,
  getServerPassword,
  setServerUrl,
  setServerPassword,
  clearServerConfig,
} from "@/services/server-store";

interface ConnectionValue {
  status: HealthStatus;
  url: string | null;
  connect: (url: string, password?: string) => void;
  disconnect: () => void;
}

const ConnectionContext = createContext<ConnectionValue | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const status = useHealth(url ?? "");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedUrl, storedPassword] = await Promise.all([
        getServerUrl(),
        getServerPassword(),
      ]);
      if (cancelled) return;
      if (storedUrl) {
        createClient(storedUrl, storedPassword ?? undefined);
        setUrl(storedUrl);
      }
      setInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback((serverUrl: string, password?: string) => {
    createClient(serverUrl, password);
    setServerUrl(serverUrl).catch(console.error);
    if (password) setServerPassword(password).catch(console.error);
    setUrl(serverUrl);
  }, []);

  const disconnect = useCallback(() => {
    clearServerConfig().catch(console.error);
    setUrl(null);
  }, []);

  const derivedStatus: HealthStatus = !initialized ? "loading" : status;

  return (
    <ConnectionContext.Provider
      value={{ status: derivedStatus, url, connect, disconnect }}
    >
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

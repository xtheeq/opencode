import { useEffect, useState } from "react";
import { getClient } from "@/services/api";

export type HealthStatus =
  | "loading"
  | "idle"
  | "checking"
  | "connected"
  | "error";

export function useHealth(url: string) {
  const [status, setStatus] = useState<HealthStatus>(url ? "checking" : "idle");

  useEffect(() => {
    if (!url) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("checking");
    getClient()
      .health.get()
      .then(() => {
        if (!cancelled) setStatus("connected");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return status;
}

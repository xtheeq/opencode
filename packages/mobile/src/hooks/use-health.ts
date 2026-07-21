import { useEffect, useState } from "react";
import { client } from "@/services/api";

export type HealthStatus = "checking" | "connected" | "error";

export function useHealth() {
  const [status, setStatus] = useState<HealthStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    client.health
      .get()
      .then(() => {
        if (!cancelled) setStatus("connected");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

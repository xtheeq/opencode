import { ClientError } from "@opencode-ai/client/promise";

const TRANSIENT_MESSAGES = [
  // Mirrors @opencode-ai/core/util/retry.ts;
  "load failed",
  "network connection was lost",
  "network request failed",
  "failed to fetch",
  "econnreset",
  "econnrefused",
  "enotfound",
  "getaddrinfo",
  "etimedout",
  "socket hang up",
  "timed out connecting to server",
  "event stream disconnected",
  "event stream did not start with server.connected",
];

export function isTransientError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof ClientError) {
    switch (error.reason) {
      case "Transport":
        return isTransientError(error.cause);
      case "UnexpectedStatus": {
        const status = (error.cause as { status?: number } | undefined)?.status;
        return status !== undefined && status >= 500;
      }
      case "UnsupportedContentType":
      case "MalformedResponse":
      case "SseEventTooLarge":
        return false;
    }
  }
  const message = String(
    error instanceof Error ? error.message : error,
  ).toLowerCase();
  return TRANSIENT_MESSAGES.some((m) => message.includes(m));
}

export interface Pairing {
  url: string;
  password?: string;
}

export function parsePairing(raw: string): Pairing | undefined {
  const value = raw.trim();
  if (value.startsWith("{")) return parsePairPayload(value);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return;
  }
  if (parsed.protocol === "http:" || parsed.protocol === "https:")
    return { url: value };
  if (parsed.protocol !== "opencode:" || parsed.hostname !== "connect") return;
  const url = parsed.searchParams.get("url");
  if (!url || !isServerUrl(url)) return;
  return { url, password: parsed.searchParams.get("password") || undefined };
}

function parsePairPayload(value: string): Pairing | undefined {
  let payload: unknown;
  try {
    payload = JSON.parse(value);
  } catch {
    return;
  }
  if (typeof payload !== "object" || payload === null) return;
  const record = payload as Record<string, unknown>;
  if (!Array.isArray(record.urls)) return;
  const candidates = (record.urls as unknown[]).filter(
    (url): url is string => typeof url === "string" && isServerUrl(url),
  );
  if (candidates.length === 0) return;
  const url =
    candidates.find((candidate) => !isLoopback(new URL(candidate).hostname)) ??
    candidates[0];
  const password =
    typeof record.password === "string" && record.password !== ""
      ? record.password
      : undefined;
  return { url, password };
}

function isServerUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isLoopback(hostname: string) {
  return hostname === "localhost" || hostname === "::1" || /^127\./.test(hostname);
}

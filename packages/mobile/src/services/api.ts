import { OpenCode } from "@opencode-ai/client/promise";

let client: ReturnType<typeof OpenCode.make>;

export function createClient(url: string, password?: string) {
  const headers: Record<string, string> = {};
  if (password) {
    headers["Authorization"] = "Basic " + btoa("opencode:" + password);
  }
  client = OpenCode.make({ baseUrl: url, headers });
  return client;
}

export function getClient() {
  if (!client) throw new Error("Client not initialized");
  return client;
}

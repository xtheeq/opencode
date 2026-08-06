import { OpenCode } from "@opencode-ai/client/promise";

export function createClient(url: string, password?: string) {
  const headers: Record<string, string> = {};
  if (password) {
    headers["Authorization"] = "Basic " + btoa("opencode:" + password);
  }
  return OpenCode.make({ baseUrl: url, headers });
}

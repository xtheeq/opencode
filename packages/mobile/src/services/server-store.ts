import * as SecureStore from "expo-secure-store";
import type { LocationRef } from "@opencode-ai/client/promise";

const KEYS = {
  url: "server-url",
  password: "server-password",
  location: "server-location",
} as const;

export async function getServerUrl(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.url);
  } catch {
    return null;
  }
}

export async function setServerUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.url, url);
}

export async function getServerPassword(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.password);
  } catch {
    return null;
  }
}

export async function setServerPassword(password: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.password, password);
}

// The selected project directory (LocationRef JSON). Set by the project
// picker/home flow and restored on boot so sessions are created in the user's
// chosen project instead of the server daemon's process cwd.
export async function getLocation(): Promise<LocationRef | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEYS.location);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocationRef> | null;
    if (!parsed || typeof parsed.directory !== "string" || !parsed.directory) {
      return null;
    }
    return {
      directory: parsed.directory,
      workspaceID: parsed.workspaceID,
    };
  } catch {
    return null;
  }
}

export async function setLocation(location: LocationRef): Promise<void> {
  await SecureStore.setItemAsync(
    KEYS.location,
    JSON.stringify({ directory: location.directory, workspaceID: location.workspaceID }),
  );
}

export async function clearServerConfig(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.url);
  await SecureStore.deleteItemAsync(KEYS.password);
  // The location is host-specific too: never reuse a directory from a previous
  // server when the config is wiped.
  await SecureStore.deleteItemAsync(KEYS.location);
}

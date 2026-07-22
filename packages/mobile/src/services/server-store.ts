import * as SecureStore from "expo-secure-store";

const KEYS = {
  url: "server-url",
  password: "server-password",
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

export async function clearServerConfig(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.url);
  await SecureStore.deleteItemAsync(KEYS.password);
}

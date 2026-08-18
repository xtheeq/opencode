import { describe, expect, test } from "bun:test";
import type { LocationRef } from "@opencode-ai/client/promise";
import {
  composerLocation,
  isNewSessionKey,
} from "@/hooks/use-composer";

const defaultLocation: LocationRef = { directory: "/workspace/selected" };
const sessionLocation: LocationRef = { directory: "/workspace/other", workspaceID: "ws_1" };

describe("isNewSessionKey", () => {
  test("treats the reserved key as a new-session composer", () => {
    expect(isNewSessionKey("new")).toBe(true);
  });

  test("treats real session ids as existing sessions", () => {
    expect(isNewSessionKey("ses_abc")).toBe(false);
  });
});

describe("composerLocation", () => {
  test("uses the selected project default for the new-session composer", () => {
    expect(composerLocation("new", undefined, defaultLocation)).toEqual(defaultLocation);
  });

  test("uses the session location for a real session", () => {
    expect(
      composerLocation("ses_abc", { location: sessionLocation }, defaultLocation),
    ).toEqual(sessionLocation);
  });

  test("falls back to the default when a real session lacks a location", () => {
    expect(composerLocation("ses_abc", { location: undefined }, defaultLocation)).toEqual(
      defaultLocation,
    );
  });
});

import { describe, expect, test } from "bun:test";
import { connectionPhase } from "@/utils/connection-phase";

type PhaseInput = Parameters<typeof connectionPhase>[0];

const base: PhaseInput = {
  configLoaded: true,
  configured: true,
  status: "connected",
  everConnected: true,
};

function phase(overrides: Partial<PhaseInput> = {}) {
  return connectionPhase({ ...base, ...overrides });
}

describe("connectionPhase", () => {
  test("stays loading until the stored server config is loaded", () => {
    expect(phase({ configLoaded: false })).toBe("loading");
  });

  test("shows the connect screen when no server is configured", () => {
    expect(phase({ configured: false })).toBe("connect");
  });

  test("keeps the connect screen mounted while the first connect is in flight", () => {
    expect(phase({ status: "connecting", everConnected: false })).toBe(
      "connect",
    );
  });

  test("returns to the connect screen when the first connect fails", () => {
    expect(phase({ status: "disconnected", everConnected: false })).toBe(
      "connect",
    );
  });

  test("is ready once connected", () => {
    expect(phase({ everConnected: false })).toBe("ready");
  });

  test("stays ready while reconnecting", () => {
    expect(phase({ status: "reconnecting" })).toBe("ready");
  });

  test("stays ready after an established connection gives up", () => {
    expect(phase({ status: "disconnected" })).toBe("ready");
  });
});

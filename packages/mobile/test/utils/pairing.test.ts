import { describe, expect, test } from "bun:test";
import { parsePairing } from "@/utils/pairing";

const encoded = (value: string) => encodeURIComponent(value);

describe("parsePairing", () => {
  test("parses the canonical connect scheme with password", () => {
    expect(
      parsePairing(
        `opencode://connect?url=${encoded("http://192.168.1.10:4096")}&password=s3cret`,
      ),
    ).toEqual({ url: "http://192.168.1.10:4096", password: "s3cret" });
  });

  test("parses the connect scheme without password", () => {
    expect(
      parsePairing(
        `opencode://connect?url=${encoded("https://server.example:4096")}`,
      ),
    ).toEqual({ url: "https://server.example:4096" });
  });

  test("empty password means none", () => {
    expect(
      parsePairing(
        `opencode://connect?url=${encoded("http://10.0.0.2:4096")}&password=`,
      ),
    ).toEqual({ url: "http://10.0.0.2:4096" });
  });

  test("accepts bare server URLs", () => {
    expect(parsePairing("http://localhost:4096")).toEqual({
      url: "http://localhost:4096",
    });
    expect(parsePairing(" https://opencode.example/some/path ")).toEqual({
      url: "https://opencode.example/some/path",
    });
  });

  test("trims whitespace around the payload", () => {
    expect(parsePairing("  http://localhost:4096  ")).toEqual({
      url: "http://localhost:4096",
    });
  });

  test("parses the TUI pair payload preferring a routable URL", () => {
    const payload = JSON.stringify({
      urls: ["http://localhost:4096/", "http://192.168.1.10:4096/"],
      username: "opencode",
      password: "s3cret",
    });
    expect(parsePairing(payload)).toEqual({
      url: "http://192.168.1.10:4096/",
      password: "s3cret",
    });
  });

  test("pair payload falls back to the first URL when all are loopback", () => {
    expect(
      parsePairing(
        JSON.stringify({
          urls: ["http://127.0.0.1:4096", "http://localhost:4096"],
          password: "",
        }),
      ),
    ).toEqual({ url: "http://127.0.0.1:4096" });
  });

  test("rejects malformed pair payloads", () => {
    expect(parsePairing("{")).toBeUndefined();
    expect(parsePairing("{}")).toBeUndefined();
    expect(
      parsePairing(JSON.stringify({ urls: [], password: "x" })),
    ).toBeUndefined();
    expect(
      parsePairing(JSON.stringify({ urls: ["ftp://10.0.0.2"] })),
    ).toBeUndefined();
    expect(
      parsePairing(JSON.stringify({ urls: "http://10.0.0.2" })),
    ).toBeUndefined();
  });

  test("rejects non-pairing payloads", () => {
    expect(parsePairing("")).toBeUndefined();
    expect(parsePairing("not a url")).toBeUndefined();
    expect(parsePairing("ftp://192.168.1.10")).toBeUndefined();
    expect(parsePairing("opencode://other?url=http://x")).toBeUndefined();
  });

  test("requires an http(s) server url in the connect scheme", () => {
    expect(parsePairing("opencode://connect")).toBeUndefined();
    expect(
      parsePairing(`opencode://connect?url=${encoded("ftp://10.0.0.2")}`),
    ).toBeUndefined();
    expect(
      parsePairing(`opencode://connect?url=${encoded("javascript:alert(1)")}`),
    ).toBeUndefined();
  });
});

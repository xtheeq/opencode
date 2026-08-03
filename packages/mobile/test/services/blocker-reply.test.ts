import { describe, expect, test } from "bun:test";
import type { FormInfo, LocationRef } from "@opencode-ai/client/promise";
import { formRequestOptions } from "@/services/blocker-reply";

const form = (overrides: Partial<FormInfo & { location?: LocationRef }> = {}): FormInfo & {
  location?: LocationRef;
} => ({
  id: "frm_1",
  sessionID: "ses_1",
  title: "Test",
  fields: [{ type: "string", key: "a" }],
  ...overrides,
});

describe("formRequestOptions", () => {
  test("routes global forms through directory headers", () => {
    const options = formRequestOptions(
      form({ sessionID: "global", location: { directory: "/tmp/my project", workspaceID: "ws_1" } }),
    );
    expect(options).toEqual({
      headers: {
        "x-opencode-directory": "%2Ftmp%2Fmy%20project",
        "x-opencode-workspace": "ws_1",
      },
    });
  });

  test("omits the workspace header when absent", () => {
    const options = formRequestOptions(
      form({ sessionID: "global", location: { directory: "/tmp" } }),
    );
    expect(options?.headers["x-opencode-workspace"]).toBeUndefined();
    expect(options?.headers["x-opencode-directory"]).toBe("%2Ftmp");
  });

  test("global forms without a location resolve nowhere", () => {
    expect(formRequestOptions(form({ sessionID: "global" }))).toBeUndefined();
  });

  test("session forms need no location headers", () => {
    expect(
      formRequestOptions(form({ location: { directory: "/tmp" } })),
    ).toBeUndefined();
  });
});

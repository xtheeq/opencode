import { describe, expect, test } from "bun:test";
import type {
  PermissionRequest,
  SessionMessageAssistantTool,
} from "@opencode-ai/client/promise";
import {
  createPermissionBodyState,
  permissionCancel,
  permissionEscape,
  permissionInfo,
  permissionOptions,
  permissionReject,
  permissionRun,
  permissionSetError,
  permissionSetSubmitting,
  permissionShift,
} from "@/utils/permission-state";

const request = (
  overrides: Partial<PermissionRequest> = {},
): PermissionRequest => ({
  id: "per_1",
  sessionID: "ses_1",
  action: "shell",
  resources: [],
  ...overrides,
});

const tool = (
  state: SessionMessageAssistantTool["state"],
): SessionMessageAssistantTool => ({
  type: "tool",
  id: "call_1",
  name: "bash",
  state,
  time: { created: 0 },
});

describe("createPermissionBodyState / permissionOptions", () => {
  test("starts at the permission stage", () => {
    const state = createPermissionBodyState(request());
    expect(state.stage).toBe("permission");
    expect(state.selected).toBe("once");
    expect(permissionOptions(state.stage)).toEqual([
      "once",
      "always",
      "reject",
    ]);
  });

  test("always stage offers confirm/cancel", () => {
    expect(permissionOptions("always")).toEqual(["confirm", "cancel"]);
    expect(permissionOptions("reject")).toEqual([]);
  });
});

describe("permissionRun", () => {
  test("once replies immediately", () => {
    const state = createPermissionBodyState(request());
    const step = permissionRun(state, "per_1", "once");
    expect(step.reply).toEqual({
      sessionID: "ses_1",
      requestID: "per_1",
      reply: "once",
    });
    expect(step.state.stage).toBe("permission");
  });

  test("always and reject advance the stage", () => {
    const state = createPermissionBodyState(request());
    const always = permissionRun(state, "per_1", "always");
    expect(always.state.stage).toBe("always");
    expect(always.state.selected).toBe("confirm");
    expect(always.reply).toBeUndefined();

    const reject = permissionRun(state, "per_1", "reject");
    expect(reject.state.stage).toBe("reject");
    expect(reject.state.selected).toBe("reject");
  });

  test("always confirm replies always, cancel returns to permission", () => {
    let state = createPermissionBodyState(request());
    state = permissionRun(state, "per_1", "always").state;
    const confirm = permissionRun(state, "per_1", "confirm");
    expect(confirm.reply).toEqual({
      sessionID: "ses_1",
      requestID: "per_1",
      reply: "always",
    });

    const cancel = permissionRun(state, "per_1", "cancel");
    expect(cancel.reply).toBeUndefined();
    expect(cancel.state.stage).toBe("permission");
    expect(cancel.state.selected).toBe("always");
  });

  test("ignores input while submitting", () => {
    const state = { ...createPermissionBodyState(request()), submitting: true };
    const step = permissionRun(state, "per_1", "once");
    expect(step.reply).toBeUndefined();
    expect(step.state).toBe(state);
  });
});

describe("permissionReject", () => {
  test("builds a reply with the trimmed message", () => {
    let state = createPermissionBodyState(request());
    state = { ...state, message: "  use safer flags  " };
    expect(permissionReject(state, "per_1")).toEqual({
      sessionID: "ses_1",
      requestID: "per_1",
      reply: "reject",
      message: "use safer flags",
    });
  });

  test("omits message when empty", () => {
    const state = createPermissionBodyState(request());
    expect(permissionReject(state, "per_1")).toEqual({
      sessionID: "ses_1",
      requestID: "per_1",
      reply: "reject",
    });
  });

  test("returns undefined while submitting", () => {
    const state = { ...createPermissionBodyState(request()), submitting: true };
    expect(permissionReject(state, "per_1")).toBeUndefined();
  });
});

describe("permissionEscape / permissionCancel", () => {
  test("escape from permission goes to reject", () => {
    const state = createPermissionBodyState(request());
    expect(permissionEscape(state).stage).toBe("reject");
  });

  test("escape from always returns to permission", () => {
    let state = createPermissionBodyState(request());
    state = permissionRun(state, "per_1", "always").state;
    const escaped = permissionEscape(state);
    expect(escaped.stage).toBe("permission");
    expect(escaped.selected).toBe("always");
  });

  test("cancel returns to permission with reject selected", () => {
    const state = createPermissionBodyState(request());
    const cancelled = permissionCancel(state);
    expect(cancelled.stage).toBe("permission");
    expect(cancelled.selected).toBe("reject");
  });
});

describe("permissionShift", () => {
  test("cycles the selection within the stage options", () => {
    const state = createPermissionBodyState(request());
    expect(permissionShift(state, 1).selected).toBe("always");
    expect(permissionShift(permissionShift(state, 1), 1).selected).toBe(
      "reject",
    );
    expect(permissionShift(state, -1).selected).toBe("reject");
  });

  test("does nothing on empty option lists", () => {
    const state = {
      ...createPermissionBodyState(request()),
      stage: "reject" as const,
    };
    expect(permissionShift(state, 1)).toBe(state);
  });
});

describe("permissionSetSubmitting / permissionSetError", () => {
  test("sets submitting and clears it on error", () => {
    let state = createPermissionBodyState(request());
    state = permissionSetSubmitting(state, true);
    expect(state.submitting).toBe(true);
    state = permissionSetError(state, "boom");
    expect(state.error).toBe("boom");
    expect(state.submitting).toBe(false);
  });
});

describe("permissionInfo", () => {
  test("pulls tool input from the tool part", () => {
    const info = permissionInfo({
      ...request({ action: "shell" }),
      tool: tool({ status: "running", input: { command: "ls" }, metadata: {} }),
    });
    expect(info.title).toBe("Shell command");
    expect(info.lines).toEqual(["$ ls"]);
  });

  test("ignores input while the tool is streaming", () => {
    const info = permissionInfo({
      ...request({ action: "shell" }),
      tool: tool({ status: "streaming", input: "ls" }),
    });
    expect(info.lines).toEqual([]);
  });

  test("applies the path formatter", () => {
    const info = permissionInfo(
      { ...request({ action: "read", resources: ["/a/b"] }) },
      (value) => `<${value}>`,
    );
    expect(info.title).toBe("Read </a/b>");
  });
});

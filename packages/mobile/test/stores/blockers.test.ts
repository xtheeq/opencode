import { describe, expect, test } from "bun:test";
import {
  pickBlocker,
  selectBlockers,
  setAutoApprove,
  type Blocker,
  type Store,
} from "@/stores/store";

const store = (input: {
  info?: Record<string, { parentID?: string }>;
  family?: Record<string, string[]>;
  blocker?: Record<string, Blocker[]>;
  autoApprove?: Record<string, boolean>;
} = {}): Store =>
  ({
    session: {
      info: input.info ?? {},
      family: input.family ?? {},
      blocker: input.blocker ?? {},
      autoApprove: input.autoApprove ?? {},
    },
  }) as unknown as Store;

const blocker = (kind: Blocker["kind"], id: string, sessionID = id): Blocker =>
  ({ kind, request: { id, sessionID } }) as unknown as Blocker;

describe("pickBlocker", () => {
  test("returns undefined for no blockers", () => {
    expect(pickBlocker([])).toBeUndefined();
  });

  test("prioritizes permission over form and question", () => {
    const picked = pickBlocker([
      blocker("question", "q_1"),
      blocker("form", "frm_1"),
      blocker("permission", "per_1"),
    ]);
    expect(picked?.kind).toBe("permission");
  });

  test("prefers form over question", () => {
    const picked = pickBlocker([blocker("question", "q_1"), blocker("form", "frm_1")]);
    expect(picked?.kind).toBe("form");
  });
});

describe("selectBlockers", () => {
  test("root session collects descendants and global forms", () => {
    const s = store({
      info: { root: {}, child: { parentID: "root" } },
      family: { root: ["root", "child"] },
      blocker: {
        root: [blocker("permission", "per_root")],
        child: [blocker("form", "frm_child")],
        global: [blocker("form", "frm_global", "global")],
      },
    });
    const blockers = selectBlockers(s, "root");
    expect(blockers).toHaveLength(3);
    expect(blockers.map((b) => b.request.id)).toEqual(["per_root", "frm_child", "frm_global"]);
  });

  test("child session only sees its own blockers plus global", () => {
    const s = store({
      info: { root: {}, child: { parentID: "root" } },
      family: { root: ["root", "child"] },
      blocker: {
        root: [blocker("permission", "per_root")],
        child: [blocker("form", "frm_child")],
        global: [blocker("form", "frm_global", "global")],
      },
    });
    const blockers = selectBlockers(s, "child");
    expect(blockers.map((b) => b.request.id)).toEqual(["frm_child", "frm_global"]);
  });

  test("surfaces global forms even with no session blockers", () => {
    const s = store({ blocker: { global: [blocker("form", "frm_global", "global")] } });
    expect(selectBlockers(s, "root").map((b) => b.request.id)).toEqual(["frm_global"]);
  });

  test("de-duplicates the root session id in the family", () => {
    const s = store({
      info: { root: {} },
      family: { root: ["root", "root"] },
      blocker: { root: [blocker("permission", "per_root")] },
    });
    expect(selectBlockers(s, "root")).toHaveLength(1);
  });
});

describe("setAutoApprove", () => {
  test("adds the session key when enabled", () => {
    const s = store();
    setAutoApprove(s, "ses_1", true);
    expect(s.session.autoApprove["ses_1"]).toBe(true);
  });

  test("removes the session key when disabled", () => {
    const s = store({ autoApprove: { ses_1: true } });
    setAutoApprove(s, "ses_1", false);
    expect(s.session.autoApprove["ses_1"]).toBeUndefined();
  });
});

import type { FormAnswer } from "@opencode-ai/client/promise";
import { getClient } from "@/stores/store";
import { eventStore, type FormWithLocation } from "@/stores/store";
import type { PermissionReplyValue } from "@/utils/permission-state";

// Global forms carry no session; the server resolves their location from request headers.
export function formRequestOptions(form: FormWithLocation) {
  if (form.sessionID !== "global" || !form.location) return undefined;
  return {
    headers: {
      "x-opencode-directory": encodeURIComponent(form.location.directory),
      ...(form.location.workspaceID
        ? { "x-opencode-workspace": form.location.workspaceID }
        : {}),
    },
  };
}

export async function replyPermission(input: PermissionReplyValue) {
  await getClient().permission.reply(input);
}

// Dedup across the reducer and backfill sweep; forget a failure so it can retry.
const MAX_RESPONDED = 1000;
const RESPONDED_TTL_MS = 60 * 60 * 1000;
const autoResponded = new Map<string, number>();

function pruneAutoResponded(now: number) {
  for (const [id, ts] of autoResponded) {
    if (now - ts < RESPONDED_TTL_MS) break;
    autoResponded.delete(id);
  }
  for (const id of autoResponded.keys()) {
    if (autoResponded.size <= MAX_RESPONDED) break;
    autoResponded.delete(id);
  }
}

export function replyOnce(input: PermissionReplyValue) {
  const now = Date.now();
  const hit = autoResponded.has(input.requestID);
  autoResponded.delete(input.requestID);
  autoResponded.set(input.requestID, now);
  pruneAutoResponded(now);
  if (hit) return;
  void replyPermission(input).catch(() =>
    autoResponded.delete(input.requestID),
  );
}

export function sweepAutoApproved(sessionID: string) {
  (eventStore.getState().session.blocker[sessionID] ?? [])
    .filter((blocker) => blocker.kind === "permission")
    .forEach((blocker) => {
      replyOnce({
        sessionID,
        requestID: blocker.request.id,
        reply: "once",
      });
    });
}

export async function replyForm(form: FormWithLocation, answer: FormAnswer) {
  await getClient().form.reply(
    { sessionID: form.sessionID, formID: form.id, answer },
    formRequestOptions(form),
  );
}

export async function cancelForm(form: FormWithLocation) {
  await getClient().form.cancel(
    { sessionID: form.sessionID, formID: form.id },
    formRequestOptions(form),
  );
}

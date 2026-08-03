import type { FormAnswer, QuestionRequest } from "@opencode-ai/client/promise";
import { getClient } from "@/services/api";
import type { FormWithLocation } from "@/stores/store";
import type { PermissionReplyValue } from "@/utils/permission-state";

// Global forms (sessionID === "global") carry no session of their own, so the
// server resolves their location from request headers (see server/src/location.ts).
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

export async function replyQuestion(request: QuestionRequest, answers: string[][]) {
  await getClient().question.reply({
    sessionID: request.sessionID,
    requestID: request.id,
    answers,
  });
}

export async function rejectQuestion(request: QuestionRequest) {
  await getClient().question.reject({
    sessionID: request.sessionID,
    requestID: request.id,
  });
}

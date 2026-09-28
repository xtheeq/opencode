import { useShallow } from "zustand/react/shallow";
import type {
  SessionMessageAssistant,
  SessionMessageInfo,
} from "@opencode/client/promise";
import { eventStore } from "@/stores/store";
import type { AssistantContentPart, PartRef } from "@/types/rows";

// A message list gets a by-id index memoized on array identity. immer produces a
// new array on every delta, so this rebuilds once per delta and is shared by
// every mounted row selector instead of each doing an O(messages) find.
const messageMaps = new WeakMap<
  SessionMessageInfo[],
  Map<string, SessionMessageInfo>
>();

function messageMap(list: SessionMessageInfo[] | undefined) {
  if (!list) return undefined;
  let map = messageMaps.get(list);
  if (!map) {
    map = new Map(list.map((message) => [message.id, message]));
    messageMaps.set(list, map);
  }
  return map;
}

function resolveContent(
  message: SessionMessageAssistant,
  partID: string,
): AssistantContentPart | undefined {
  const ordinals = { text: 0, reasoning: 0 };
  for (const part of message.content) {
    const id =
      part.type === "tool" ? part.id : `${part.type}:${ordinals[part.type]++}`;
    if (id === partID) return part;
  }
  return undefined;
}

const EMPTY_PARTS: AssistantContentPart[] = [];

export function useSessionMessage(
  sessionID: string,
  messageID: string,
): SessionMessageInfo | undefined {
  return eventStore((s) => messageMap(s.session.message[sessionID])?.get(messageID));
}

export function useSessionPart(
  sessionID: string,
  messageID: string,
  partID: string,
): AssistantContentPart | undefined {
  return eventStore((s) => {
    const message = messageMap(s.session.message[sessionID])?.get(messageID);
    if (message?.type !== "assistant") return undefined;
    return resolveContent(message, partID);
  });
}

export function useSessionParts(
  sessionID: string,
  refs: PartRef[],
): AssistantContentPart[] {
  return eventStore(
    useShallow((s) => {
      const map = messageMap(s.session.message[sessionID]);
      if (!map) return EMPTY_PARTS;
      const parts: AssistantContentPart[] = [];
      for (const ref of refs) {
        const message = map.get(ref.messageID);
        if (message?.type !== "assistant") continue;
        const content = resolveContent(message, ref.partID);
        if (content) parts.push(content);
      }
      return parts.length === 0 ? EMPTY_PARTS : parts;
    }),
  );
}

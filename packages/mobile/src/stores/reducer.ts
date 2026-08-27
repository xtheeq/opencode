import type { SessionMessageInfo, V2Event } from "@opencode-ai/client/promise";
import { getClient } from "@/stores/store";
import { replyOnce } from "@/services/blocker-reply";
import {
  activeAssistant,
  addBlocker,
  addPending,
  append,
  eventStore,
  findAssistant,
  findRunningCompaction,
  findShellByShellID,
  index,
  latestReasoning,
  latestText,
  latestTool,
  locationKey,
  messageIDFromEvent,
  removeBlocker,
  removePending,
  setDelivery,
} from "./store";
import {
  loadSession,
  refreshLocation,
  removeSession,
  sync,
  syncProjectList,
} from "./sync";

export function handleEvent(event: V2Event) {
  switch (event.type) {
    case "session.created":
      sync.invalidate(`session:${event.data.sessionID}`);
      loadSession(event.data.sessionID);
      break;

    case "session.deleted":
      eventStore.setState((s) => {
        removeSession(s, event.data.sessionID);
      });
      break;

    case "session.usage.updated":
      eventStore.setState((s) => {
        const info = s.session.info[event.data.sessionID];
        if (info) {
          info.cost = event.data.cost;
          info.tokens = event.data.tokens;
        }
      });
      break;

    case "catalog.updated": {
      const loc = event.location ?? eventStore.getState()._defaultLocation;
      refreshLocation("model", loc);
      refreshLocation("provider", loc);
      break;
    }

    case "agent.updated":
      refreshLocation(
        "agent",
        event.location ?? eventStore.getState()._defaultLocation,
      );
      break;

    case "command.updated":
      refreshLocation(
        "command",
        event.location ?? eventStore.getState()._defaultLocation,
      );
      break;

    case "skill.updated":
      refreshLocation(
        "skill",
        event.location ?? eventStore.getState()._defaultLocation,
      );
      break;

    case "session.agent.selected":
      eventStore.setState((s) => {
        if (s.session.info[event.data.sessionID])
          s.session.info[event.data.sessionID].agent = event.data.agent;
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(messages, idx, {
          id: messageIDFromEvent(event.id),
          type: "agent-switched",
          agent: event.data.agent,
          time: { created: event.created },
        });
      });
      break;

    case "session.model.selected":
      eventStore.setState((s) => {
        if (s.session.info[event.data.sessionID])
          s.session.info[event.data.sessionID].model = event.data.model;
      });
      {
        const hasMessages =
          eventStore.getState().session.message[event.data.sessionID];
        if (hasMessages) {
          eventStore.setState((s) => {
            const idx = index(event.data.sessionID);
            const messages = (s.session.message[event.data.sessionID] ??= []);
            append(messages, idx, {
              id: messageIDFromEvent(event.id),
              type: "model-switched",
              model: event.data.model,
              time: { created: event.created },
            });
          });
        }
        getClient()
          .session.message({
            sessionID: event.data.sessionID,
            messageID: messageIDFromEvent(event.id),
          })
          .then((item) => {
            eventStore.setState((s) => {
              const idx = index(event.data.sessionID);
              const messages = s.session.message[event.data.sessionID];
              if (!messages) return;
              const position = idx.get(item.id);
              if (position === undefined) {
                append(messages, idx, item);
                return;
              }
              messages[position] = item;
            });
          })
          .catch((error: Error) =>
            console.error(
              "Failed to load projected model switch message",
              error,
            ),
          );
      }
      break;

    case "session.renamed":
      eventStore.setState((s) => {
        if (s.session.info[event.data.sessionID])
          s.session.info[event.data.sessionID].title = event.data.title;
      });
      break;

    case "session.moved":
      eventStore.setState((s) => {
        const info = s.session.info[event.data.sessionID];
        if (!info) return;
        info.location = event.data.location;
        if (event.data.projectID) info.projectID = event.data.projectID;
        info.subpath = event.data.subpath;
      });
      break;

    case "session.viewed":
      eventStore.setState((s) => {
        const info = s.session.info[event.data.sessionID];
        if (!info) return;
        info.time.viewed = Math.max(
          event.data.idle,
          info.time.viewed ?? event.data.idle,
        );
      });
      break;

    case "session.inbox.enqueued":
      eventStore.setState((s) => {
        addPending(s, {
          id: event.data.inboxID,
          sessionID: event.data.sessionID,
          timeCreated: event.created,
          ...event.data.item,
        });
        const item = event.data.item;
        if (item.type !== "user" && item.type !== "synthetic") return;
        if (
          !s.session.input[event.data.sessionID]?.includes(event.data.inboxID)
        ) {
          s.session.input[event.data.sessionID] = [
            ...(s.session.input[event.data.sessionID] ?? []),
            event.data.inboxID,
          ];
        }
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(
          messages,
          idx,
          item.type === "user"
            ? {
                id: event.data.inboxID,
                type: "user",
                text: item.payload.text,
                files: item.payload.files,
                agents: item.payload.agents,
                skills: item.payload.skills,
                metadata: item.payload.metadata,
                time: { created: event.created },
              }
            : {
                id: event.data.inboxID,
                type: "synthetic",
                text: item.payload.text,
                description: item.payload.description,
                metadata: item.payload.metadata,
                time: { created: event.created },
              },
        );
      });
      break;

    case "session.inbox.delivered": {
      eventStore.setState((s) => {
        removePending(s, event.data.sessionID, event.data.inboxID);
        const idx = index(event.data.sessionID);
        const existing = idx.get(event.data.inboxID);
        if (existing === undefined) return;
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const msg = messages[existing];
        if (
          !msg ||
          !s.session.input[event.data.sessionID]?.includes(event.data.inboxID)
        )
          return;
        msg.time.created = event.created;
        messages.splice(existing, 1);
        messages.push(msg);
        idx.clear();
        messages.forEach((m, i) => idx.set(m.id, i));
      });
      eventStore.setState((s) => {
        if (s.session.input[event.data.sessionID]) {
          s.session.input[event.data.sessionID] = s.session.input[
            event.data.sessionID
          ].filter((id) => id !== event.data.inboxID);
        }
      });
      break;
    }

    case "session.inbox.cancelled":
      eventStore.setState((s) => {
        removePending(s, event.data.sessionID, event.data.inboxID);
        const idx = index(event.data.sessionID);
        const position = idx.get(event.data.inboxID);
        if (position === undefined) return;
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        messages.splice(position, 1);
        idx.clear();
        messages.forEach((m, i) => idx.set(m.id, i));
      });
      eventStore.setState((s) => {
        if (s.session.input[event.data.sessionID]) {
          s.session.input[event.data.sessionID] = s.session.input[
            event.data.sessionID
          ].filter((id) => id !== event.data.inboxID);
        }
      });
      break;

    case "session.inbox.delivery.changed":
      eventStore.setState((s) => {
        setDelivery(
          s,
          event.data.sessionID,
          event.data.inboxID,
          event.data.delivery,
        );
      });
      break;

    case "session.instructions.updated": {
      const instructionsMeta = event.metadata?.instructions;
      if (
        typeof instructionsMeta === "object" &&
        instructionsMeta !== null &&
        "initial" in instructionsMeta &&
        instructionsMeta.initial === true
      )
        break;
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(messages, idx, {
          id: messageIDFromEvent(event.id),
          type: "system",
          text: `Instructions updated: ${Object.keys(event.data.delta).join(", ")}`,
          metadata: event.metadata,
          time: { created: event.created },
        });
      });
      break;
    }

    case "session.synthetic":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(messages, idx, {
          id: messageIDFromEvent(event.id),
          type: "synthetic",
          text: event.data.text,
          description: event.data.description,
          metadata: event.data.metadata,
          time: { created: event.created },
        });
      });
      break;

    case "session.skill.activated":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(messages, idx, {
          id: messageIDFromEvent(event.id),
          type: "skill",
          skill: event.data.id,
          name: event.data.name,
          text: event.data.text,
          metadata: event.metadata,
          time: { created: event.created },
        });
      });
      break;

    case "session.shell.started":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(messages, idx, {
          id: messageIDFromEvent(event.id),
          type: "shell",
          shellID: event.data.shell.id,
          command: event.data.shell.command,
          status: event.data.shell.status,
          exit: event.data.shell.exit,
          metadata: event.metadata,
          time: { created: event.created },
        });
      });
      break;

    case "session.shell.ended":
      eventStore.setState((s) => {
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = findShellByShellID(messages, event.data.shell.id);
        if (!match || match.type !== "shell") return;
        match.status = event.data.shell.status;
        match.exit = event.data.shell.exit;
        match.output = event.data.output;
        match.time.completed = event.created;
      });
      break;

    case "session.message.content.updated":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const assistant = findAssistant(
          messages,
          idx,
          event.data.messageID,
        );
        if (assistant) assistant.content = [...event.data.content];
      });
      break;

    case "session.step.started":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        const position = idx.get(event.data.assistantMessageID);
        const existing =
          position === undefined ? undefined : messages[position];
        if (existing?.type === "assistant") {
          existing.agent = event.data.agent;
          existing.model = event.data.model;
          existing.retry = undefined;
          existing.error = undefined;
          existing.finish = undefined;
          existing.time.completed = undefined;
          if (event.data.snapshot)
            existing.snapshot = {
              ...existing.snapshot,
              start: event.data.snapshot,
            };
          return;
        }
        const currentAssistant = activeAssistant(messages);
        if (currentAssistant) {
          currentAssistant.retry = undefined;
          currentAssistant.time.completed = event.created;
        }
        append(messages, idx, {
          id: event.data.assistantMessageID,
          type: "assistant",
          agent: event.data.agent,
          model: event.data.model,
          metadata: event.metadata,
          content: [],
          snapshot: event.data.snapshot
            ? { start: event.data.snapshot }
            : undefined,
          time: { created: event.created },
        });
      });
      break;

    case "session.step.streamed":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const currentAssistant = findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        );
        if (currentAssistant) currentAssistant.time.streamed = event.created;
      });
      break;

    case "session.step.ended":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const currentAssistant = findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        );
        if (!currentAssistant) return;
        currentAssistant.time.completed = event.created;
        currentAssistant.finish = event.data.finish;
        currentAssistant.cost = event.data.cost;
        currentAssistant.tokens = event.data.tokens;
        if (event.data.snapshot)
          currentAssistant.snapshot = {
            ...currentAssistant.snapshot,
            end: event.data.snapshot,
          };
      });
      break;

    case "session.step.failed":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const currentAssistant = findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        );
        if (!currentAssistant) return;
        currentAssistant.time.completed = event.created;
        currentAssistant.finish = "error";
        currentAssistant.error = event.data.error;
        currentAssistant.retry = undefined;
        if (event.data.cost !== undefined && event.data.tokens !== undefined) {
          currentAssistant.cost = event.data.cost;
          currentAssistant.tokens = event.data.tokens;
        }
      });
      break;

    case "session.text.started":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        )?.content.push({ type: "text", text: "" });
      });
      break;

    case "session.text.delta":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestText(
          findAssistant(messages, idx, event.data.assistantMessageID),
        );
        if (match) match.text += event.data.delta;
      });
      break;

    case "session.text.ended":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestText(
          findAssistant(messages, idx, event.data.assistantMessageID),
        );
        if (match) match.text = event.data.text;
      });
      break;

    case "session.tool.input.started":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        )?.content.push({
          type: "tool",
          id: event.data.id,
          name: event.data.name,
          time: { created: event.created },
          state: { status: "streaming", input: "" },
        });
      });
      break;

    case "session.tool.input.delta":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestTool(
          findAssistant(messages, idx, event.data.assistantMessageID),
          event.data.id,
        );
        if (match?.state.status === "streaming")
          match.state.input += event.data.delta;
      });
      break;

    case "session.tool.input.ended":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestTool(
          findAssistant(messages, idx, event.data.assistantMessageID),
          event.data.id,
        );
        if (match?.state.status === "streaming")
          match.state.input = event.data.text;
      });
      break;

    case "session.tool.called":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestTool(
          findAssistant(messages, idx, event.data.assistantMessageID),
          event.data.id,
        );
        if (!match) return;
        match.time.ran = event.created;
        match.executed = event.data.executed;
        match.providerState = event.data.state;
        match.state = {
          status: "running",
          input: event.data.input,
          metadata: {},
        };
      });
      break;

    case "session.tool.progress":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestTool(
          findAssistant(messages, idx, event.data.assistantMessageID),
          event.data.id,
        );
        if (match?.state.status !== "running") return;
        match.state.metadata = event.data.metadata;
      });
      break;

    case "session.tool.success":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestTool(
          findAssistant(messages, idx, event.data.assistantMessageID),
          event.data.id,
        );
        if (match?.state.status !== "running") return;
        match.state = {
          status: "completed",
          input: match.state.input,
          metadata: event.data.metadata,
          content: [...event.data.content],
        };
        match.executed = event.data.executed || match.executed === true;
        match.providerResultState = event.data.resultState;
        match.time.completed = event.created;
      });
      break;

    case "session.tool.failed":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestTool(
          findAssistant(messages, idx, event.data.assistantMessageID),
          event.data.id,
        );
        if (
          !match ||
          (match.state.status !== "streaming" &&
            match.state.status !== "running")
        )
          return;
        match.state = {
          status: "error",
          error: event.data.error,
          input: {},
          metadata: event.data.metadata,
          content: event.data.content,
        };
        match.executed = event.data.executed || match.executed === true;
        match.providerResultState = event.data.resultState;
        match.time.completed = event.created;
      });
      break;

    case "session.reasoning.started":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        )?.content.push({
          type: "reasoning",
          text: "",
          state: event.data.state,
          time: { created: event.created },
        });
      });
      break;

    case "session.reasoning.delta":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestReasoning(
          findAssistant(messages, idx, event.data.assistantMessageID),
        );
        if (match) match.text += event.data.delta;
      });
      break;

    case "session.reasoning.ended":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const match = latestReasoning(
          findAssistant(messages, idx, event.data.assistantMessageID),
        );
        if (match) {
          match.text = event.data.text;
          match.time = {
            created: match.time?.created ?? event.created,
            completed: event.created,
          };
          if (event.data.state !== undefined) match.state = event.data.state;
        }
      });
      break;

    case "session.retry.scheduled":
      eventStore.setState((s) => {
        const idx = index(event.data.sessionID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const currentAssistant = findAssistant(
          messages,
          idx,
          event.data.assistantMessageID,
        );
        if (!currentAssistant) return;
        currentAssistant.retry = {
          attempt: event.data.attempt,
          at: event.data.at,
          error: event.data.error,
        };
      });
      break;

    case "session.execution.started":
      eventStore.setState((s) => {
        s.session.active[event.data.sessionID] = "running";
      });
      break;

    case "session.compaction.started":
      eventStore.setState((s) => {
        removePending(s, event.data.sessionID, event.data.inputID);
        const idx = index(event.data.sessionID);
        const messages = (s.session.message[event.data.sessionID] ??= []);
        append(messages, idx, {
          id: event.data.inputID ?? messageIDFromEvent(event.id),
          type: "compaction",
          status: "running",
          reason: event.data.reason,
          summary: "",
          recent: event.data.recent ?? "",
          time: { created: event.created },
        });
      });
      break;

    case "session.execution.succeeded":
    case "session.execution.failed":
    case "session.execution.interrupted":
      eventStore.setState((s) => {
        s.session.active[event.data.sessionID] = "idle";
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const currentAssistant = activeAssistant(messages);
        if (currentAssistant) currentAssistant.retry = undefined;
      });
      break;

    case "session.revert.staged":
      eventStore.setState((s) => {
        if (s.session.info[event.data.sessionID])
          s.session.info[event.data.sessionID].revert = event.data.revert;
      });
      break;

    case "session.revert.cleared":
      eventStore.setState((s) => {
        if (s.session.info[event.data.sessionID])
          s.session.info[event.data.sessionID].revert = undefined;
      });
      break;

    case "session.revert.committed":
      eventStore.setState((s) => {
        if (s.session.info[event.data.sessionID])
          s.session.info[event.data.sessionID].revert = undefined;
      });
      eventStore.setState((s) => {
        s.session.input[event.data.sessionID] = (
          s.session.input[event.data.sessionID] ?? []
        ).filter((id) => id < event.data.to);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const idx = index(event.data.sessionID);
        const position = messages.findIndex((item) => item.id >= event.data.to);
        if (position === -1) return;
        for (const item of messages.splice(position)) idx.delete(item.id);
      });
      break;

    case "session.compaction.delta":
      eventStore.setState((s) => {
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const current = findRunningCompaction(messages);
        if (current?.type === "compaction" && current.status === "running")
          current.summary += event.data.text;
      });
      break;

    case "session.compaction.ended":
      eventStore.setState((s) => {
        s.session.pending[event.data.sessionID] = (
          s.session.pending[event.data.sessionID] ?? []
        ).filter((item) => item.type !== "compaction");
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const idx = index(event.data.sessionID);
        const position = messages.findLastIndex(
          (item) => item.type === "compaction" && item.status === "running",
        );
        const current = messages[position];
        if (current?.type === "compaction") {
          Object.assign(current, {
            status: "completed",
            reason: event.data.reason,
            summary: event.data.text,
            recent: event.data.recent,
          });
          return;
        }
        append(messages, idx, {
          id: messageIDFromEvent(event.id),
          type: "compaction",
          status: "completed",
          reason: event.data.reason,
          summary: event.data.text,
          recent: event.data.recent,
          time: { created: event.created },
        });
      });
      break;

    case "session.compaction.failed":
      eventStore.setState((s) => {
        removePending(s, event.data.sessionID, event.data.inputID);
        const messages = s.session.message[event.data.sessionID];
        if (!messages) return;
        const idx = index(event.data.sessionID);
        const position = messages.findLastIndex(
          (item) => item.type === "compaction" && item.status === "running",
        );
        const current = messages[position];
        const failed: Extract<
          SessionMessageInfo,
          { type: "compaction"; status: "failed" }
        > = {
          id: current?.id ?? event.data.inputID ?? messageIDFromEvent(event.id),
          type: "compaction",
          status: "failed",
          reason: event.data.reason ?? "manual",
          error: event.data.error ?? {
            type: "compaction.failed",
            message: "Compaction failed before recording an error",
          },
          metadata:
            current?.type === "compaction" ? current.metadata : event.metadata,
          time:
            current?.type === "compaction"
              ? current.time
              : { created: event.created },
        };
        if (current?.type === "compaction") {
          messages[position] = failed;
          return;
        }
        append(messages, idx, failed);
      });
      break;

    case "permission.asked":
      eventStore.setState((s) => {
        addBlocker(s, event.data.sessionID, {
          kind: "permission",
          request: event.data,
        });
      });
      // The blocker is always added so a failed auto-reply stays visible.
      if (eventStore.getState().session.autoApprove[event.data.sessionID]) {
        replyOnce({
          sessionID: event.data.sessionID,
          requestID: event.data.id,
          reply: "once",
        });
      }
      break;

    case "permission.replied":
      eventStore.setState((s) => {
        removeBlocker(
          s,
          event.data.sessionID,
          "permission",
          event.data.requestID,
        );
      });
      break;

    case "form.created":
      eventStore.setState((s) => {
        addBlocker(s, event.data.form.sessionID, {
          kind: "form",
          request:
            event.data.form.sessionID === "global"
              ? { ...event.data.form, location: event.location }
              : event.data.form,
        });
      });
      break;

    case "form.replied":
    case "form.cancelled":
      eventStore.setState((s) => {
        removeBlocker(s, event.data.sessionID, "form", event.data.id);
      });
      break;

    case "shell.created":
      eventStore.setState((s) => {
        const key = locationKey(event.location ?? s._defaultLocation);
        s.location[key] = {
          ...s.location[key],
          shell: {
            ...s.location[key]?.shell,
            [event.data.info.id]: event.data.info,
          },
        };
      });
      break;

    case "shell.exited":
    case "shell.deleted":
      eventStore.setState((s) => {
        if (event.location) {
          const key = locationKey(event.location);
          if (s.location[key]?.shell)
            delete s.location[key].shell[event.data.id];
        } else {
          for (const data of Object.values(s.location))
            delete data.shell?.[event.data.id];
        }
      });
      break;

    case "reference.updated":
      refreshLocation(
        "reference",
        event.location ?? eventStore.getState()._defaultLocation,
      );
      break;

    case "integration.updated": {
      const loc = event.location ?? eventStore.getState()._defaultLocation;
      refreshLocation("integration", loc);
      refreshLocation("model", loc);
      refreshLocation("provider", loc);
      break;
    }

    case "config.updated":
    case "websearch.updated": {
      const loc = event.location ?? eventStore.getState()._defaultLocation;
      refreshLocation("websearch", loc);
      break;
    }

    case "mcp.status.changed":
      refreshLocation(
        "mcp.server",
        event.location ?? eventStore.getState()._defaultLocation,
      );
      break;

    case "mcp.resources.changed":
      refreshLocation(
        "mcp.resource",
        event.location ?? eventStore.getState()._defaultLocation,
      );
      break;

    case "project.updated":
      sync.invalidate("project.list");
      syncProjectList().catch(() => undefined);
      break;

    // Explicitly out of scope for mobile: no store mutation or refetch needed.
    case "session.forked":
    // Forks are child sessions mobile never lists (root-only session list)
    // and have no fork UI; registering one would fold it into the parent's
    // blocker family as if it were a subagent.
    case "models-dev.refreshed":
    case "credential.updated":
    case "credential.switched":
    case "persistent-pty.added":
    case "persistent-pty.removed":
    case "filesystem.changed":
    case "plugin.added":
    case "plugin.updated":
    case "pty.created":
    case "pty.updated":
    case "pty.exited":
    case "pty.deleted":
    case "worktree.updated":
    case "worktree.resolved":
    case "session.status":
    case "session.idle":
    case "tui.prompt.append":
    case "tui.command.execute":
    case "tui.toast.show":
    case "tui.session.select":
    case "installation.updated":
    case "installation.update-available":
    case "vcs.branch.updated":
    case "server.connected":
      break;

    default: {
      // Exhaustiveness guard: a new V2Event type without an explicit case
      // fails typecheck instead of being silently dropped.
      const exhaustive: never = event;
    }
  }
}

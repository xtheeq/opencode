import type {
  SessionMessageInfo,
  SessionMessageAssistant,
  SessionMessageAssistantText,
  SessionMessageAssistantTool,
  SessionMessageUser,
  JsonValue,
  LLMToolContent,
} from "@opencode-ai/client/promise"
import type { InfiniteData } from "@tanstack/react-query"

type MessagePage = { data: SessionMessageInfo[]; cursor: { previous?: string; next?: string } }
type MessageData = InfiniteData<MessagePage>

function findMessage(pages: MessagePage[], id: string) {
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const index = pages[pageIndex].data.findIndex((m) => m.id === id)
    if (index !== -1) return { pageIndex, index }
  }
}

function clonePages(pages: MessagePage[]) {
  return pages.map((page) => ({ ...page, data: [...page.data] }))
}

function textPart(text = ""): SessionMessageAssistantText {
  return { type: "text", text }
}

function toolPart(name: string, callID: string): SessionMessageAssistantTool {
  return {
    type: "tool",
    id: callID,
    name,
    state: { status: "streaming", input: "" },
    time: { created: Date.now() },
  }
}

export function applyStepStarted(
  prev: MessageData,
  assistantMessageID: string,
  agent: string,
  model: { id: string; providerID: string; variant?: string },
  created: number,
) {
  if (findMessage(prev.pages, assistantMessageID)) return prev
  const pages = clonePages(prev.pages)
  if (pages.length === 0) pages.push({ data: [], cursor: {} })
  pages[0].data.unshift({
    id: assistantMessageID,
    type: "assistant",
    agent,
    model,
    content: [],
    time: { created },
  })
  return { ...prev, pages }
}

function updateContent(
  prev: MessageData,
  assistantMessageID: string,
  update: (content: NonNullable<SessionMessageAssistant["content"]>, msg: SessionMessageAssistant) => SessionMessageAssistant["content"] | SessionMessageAssistant,
) {
  const found = findMessage(prev.pages, assistantMessageID)
  if (!found) return prev
  const pages = clonePages(prev.pages)
  const msg = pages[found.pageIndex].data[found.index] as SessionMessageAssistant
  const result = update([...msg.content], msg)
  if (Array.isArray(result)) {
    pages[found.pageIndex].data[found.index] = { ...msg, content: result }
  } else {
    pages[found.pageIndex].data[found.index] = result
  }
  return { ...prev, pages }
}

function ensureOrdinal(content: NonNullable<SessionMessageAssistant["content"]>, ordinal: number) {
  while (content.length <= ordinal) content.push(textPart())
}

export function applyTextDelta(
  prev: MessageData,
  assistantMessageID: string,
  ordinal: number,
  delta: string,
) {
  return updateContent(prev, assistantMessageID, (content) => {
    ensureOrdinal(content, ordinal)
    const part = content[ordinal]
    content[ordinal] = part.type === "text" ? { ...part, text: part.text + delta } : textPart(delta)
    return content
  })
}

export function applyTextStarted(
  prev: MessageData,
  assistantMessageID: string,
  ordinal: number,
) {
  return updateContent(prev, assistantMessageID, (content) => {
    ensureOrdinal(content, ordinal)
    if (content[ordinal].type !== "text") {
      content[ordinal] = textPart()
    }
    return content
  })
}

export function applyTextEnded(
  prev: MessageData,
  assistantMessageID: string,
  ordinal: number,
  text: string,
) {
  return updateContent(prev, assistantMessageID, (content) => {
    ensureOrdinal(content, ordinal)
    content[ordinal] = textPart(text)
    return content
  })
}

export function applyReasoningStarted(
  prev: MessageData,
  assistantMessageID: string,
  ordinal: number,
) {
  return updateContent(prev, assistantMessageID, (content) => {
    ensureOrdinal(content, ordinal)
    if (content[ordinal].type !== "reasoning") {
      content[ordinal] = { type: "reasoning" as const, text: "" }
    }
    return content
  })
}

export function applyReasoningDelta(
  prev: MessageData,
  assistantMessageID: string,
  ordinal: number,
  delta: string,
) {
  return updateContent(prev, assistantMessageID, (content) => {
    ensureOrdinal(content, ordinal)
    const part = content[ordinal]
    content[ordinal] = part.type === "reasoning" ? { ...part, text: part.text + delta } : { type: "reasoning" as const, text: delta }
    return content
  })
}

export function applyReasoningEnded(
  prev: MessageData,
  assistantMessageID: string,
  ordinal: number,
  text: string,
) {
  return updateContent(prev, assistantMessageID, (content) => {
    ensureOrdinal(content, ordinal)
    content[ordinal] = { type: "reasoning" as const, text, time: { created: Date.now(), completed: Date.now() } }
    return content
  })
}

export function applyToolInputStarted(
  prev: MessageData,
  assistantMessageID: string,
  callID: string,
  name: string,
) {
  return updateContent(prev, assistantMessageID, (content) => {
    content.push(toolPart(name, callID))
    return content
  })
}

function updateStreamingToolInput(
  content: NonNullable<SessionMessageAssistant["content"]>,
  callID: string,
  update: (current: string) => string,
) {
  for (let i = 0; i < content.length; i++) {
    const part = content[i]
    if (part.type === "tool" && part.id === callID && part.state.status === "streaming") {
      content[i] = { ...part, state: { ...part.state, input: update(part.state.input) } }
      break
    }
  }
  return content
}

export function applyToolInputDelta(
  prev: MessageData,
  assistantMessageID: string,
  callID: string,
  delta: string,
) {
  return updateContent(prev, assistantMessageID, (content) =>
    updateStreamingToolInput(content, callID, (current) => current + delta),
  )
}

export function applyToolInputEnded(
  prev: MessageData,
  assistantMessageID: string,
  callID: string,
  text: string,
) {
  return updateContent(prev, assistantMessageID, (content) =>
    updateStreamingToolInput(content, callID, () => text),
  )
}

function findToolIndex(content: NonNullable<SessionMessageAssistant["content"]>, callID: string) {
  return content.findIndex((p) => p.type === "tool" && p.id === callID)
}

export function applyToolCalled(
  prev: MessageData,
  assistantMessageID: string,
  callID: string,
  input: { [x: string]: JsonValue },
  executed: boolean,
) {
  return updateContent(prev, assistantMessageID, (content) => {
    const i = findToolIndex(content, callID)
    if (i === -1) return content
    const part = content[i] as SessionMessageAssistantTool
    content[i] = {
      ...part,
      executed,
      state: {
        status: "running",
        input,
        structured: {},
        content: [],
      },
    }
    return content
  })
}

export function applyToolProgress(
  prev: MessageData,
  assistantMessageID: string,
  callID: string,
  structured: { [x: string]: JsonValue },
  progressContent: LLMToolContent[],
) {
  return updateContent(prev, assistantMessageID, (content) => {
    const i = findToolIndex(content, callID)
    if (i === -1) return content
    const part = content[i] as SessionMessageAssistantTool
    if (part.state.status === "streaming") return content
    content[i] = { ...part, state: { ...part.state, status: "running", structured, content: progressContent } }
    return content
  })
}

export function applyToolSuccess(
  prev: MessageData,
  assistantMessageID: string,
  callID: string,
  structured: { [x: string]: JsonValue },
  toolContent: LLMToolContent[],
  result: JsonValue | undefined,
) {
  return updateContent(prev, assistantMessageID, (content) => {
    const i = findToolIndex(content, callID)
    if (i === -1) return content
    const part = content[i] as SessionMessageAssistantTool
    if (part.state.status === "streaming") {
      content[i] = {
        ...part,
        state: { status: "completed", input: { raw: part.state.input }, structured, content: toolContent, result },
      }
    } else {
      content[i] = { ...part, state: { ...part.state, status: "completed", structured, content: toolContent, result } }
    }
    return content
  })
}

export function applyToolFailed(
  prev: MessageData,
  assistantMessageID: string,
  callID: string,
  errorType: string,
  errorMessage: string,
  toolContent: LLMToolContent[] | undefined,
  result: JsonValue | undefined,
) {
  return updateContent(prev, assistantMessageID, (content) => {
    const i = findToolIndex(content, callID)
    if (i === -1) return content
    const part = content[i] as SessionMessageAssistantTool
    const error = { type: errorType, message: errorMessage }
    if (part.state.status === "streaming") {
      content[i] = {
        ...part,
        state: { status: "error", input: { raw: part.state.input }, structured: {}, content: toolContent ?? [], error, result },
      }
    } else {
      content[i] = { ...part, state: { ...part.state, status: "error", error, result } }
    }
    return content
  })
}

export function applyStepEnded(
  prev: MessageData,
  assistantMessageID: string,
  finish: string,
  cost?: number,
  tokens?: { input: number; output: number; reasoning: number; cache: { read: number; write: number } },
) {
  return updateContent(prev, assistantMessageID, (_content, msg) => ({
    ...msg,
    time: { ...msg.time, completed: Date.now() },
    finish: finish as SessionMessageAssistant["finish"],
    cost,
    tokens,
  }))
}

export function applyStepFailed(
  prev: MessageData,
  assistantMessageID: string,
  errorType: string,
  errorMessage: string,
) {
  return updateContent(prev, assistantMessageID, (_content, msg) => ({
    ...msg,
    time: { ...msg.time, completed: Date.now() },
    error: { type: errorType, message: errorMessage },
  }))
}

export function applyExecutionFailed(
  prev: MessageData,
  errorType: string,
  errorMessage: string,
) {
  const pages = clonePages(prev.pages)
  for (const page of pages) {
    for (let i = 0; i < page.data.length; i++) {
      const msg = page.data[i]
      if (msg.type === "assistant" && !msg.time.completed) {
        page.data[i] = { ...msg, retry: undefined, error: { type: errorType, message: errorMessage } }
        return { ...prev, pages }
      }
    }
  }
  return { ...prev, pages }
}

export function applyExecutionSucceeded(prev: MessageData) {
  return clearRetry(prev)
}

export function applyExecutionInterrupted(prev: MessageData) {
  return clearRetry(prev)
}

function clearRetry(prev: MessageData) {
  const pages = clonePages(prev.pages)
  for (const page of pages) {
    for (let i = 0; i < page.data.length; i++) {
      const msg = page.data[i]
      if (msg.type === "assistant" && !msg.time.completed) {
        page.data[i] = { ...msg, retry: undefined }
        return { ...prev, pages }
      }
    }
  }
  return { ...prev, pages }
}

export function applyRetryScheduled(
  prev: MessageData,
  assistantMessageID: string,
  attempt: number,
  errorType: string,
  errorMessage: string,
) {
  return updateContent(prev, assistantMessageID, (_content, msg) => ({
    ...msg,
    retry: { attempt, at: Date.now(), error: { type: errorType, message: errorMessage } },
  }))
}

export function applyInputAdmitted(
  prev: MessageData,
  inputID: string,
  text: string,
) {
  const pages = clonePages(prev.pages)
  if (pages.length === 0) pages.push({ data: [], cursor: {} })
  pages[0].data.unshift({
    id: inputID,
    type: "user",
    text,
    time: { created: Date.now() },
  })
  return { ...prev, pages }
}

export function applyInputPromoted(
  prev: MessageData,
  inputID: string,
  created: number,
) {
  const pages = clonePages(prev.pages)
  for (const page of pages) {
    const index = page.data.findIndex((m) => m.id === inputID)
    if (index !== -1) {
      const [msg] = page.data.splice(index, 1)
      if (msg.type === "user" || msg.type === "synthetic") {
        msg.time = { created }
      }
      if (pages.length === 0) pages.push({ data: [], cursor: {} })
      pages[0].data.unshift(msg)
      return { ...prev, pages }
    }
  }
  return prev
}

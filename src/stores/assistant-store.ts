import { create } from "zustand";
import type { AskResult } from "@/lib/assistant/client";
import type { ChatTurn } from "@/lib/assistant/run";

export type Ask = (
  history: readonly ChatTurn[],
  onText: (delta: string) => void,
) => Promise<AskResult>;

/** Why the last question has no (complete) answer. The panel turns it into words. */
export type AssistantNotice =
  { kind: "refused" } | { kind: "truncated" } | Exclude<AskResult, { kind: "done" }>;

interface AssistantState {
  open: boolean;
  history: ChatTurn[];
  question: string;
  pending: boolean;
  notice: AssistantNotice | null;
  /** Bumped on reset, so an answer still streaming after sign-out is dropped. */
  session: number;
}

interface AssistantActions {
  setOpen: (open: boolean) => void;
  setQuestion: (question: string) => void;
  /** Sends the current question with the conversation so far, streaming the answer in. */
  send: (ask: Ask) => Promise<void>;
  /** Forgets the conversation (sign-in and sign-out). */
  reset: () => void;
}

const INITIAL: Omit<AssistantState, "session"> = {
  open: false,
  history: [],
  question: "",
  pending: false,
  notice: null,
};

/**
 * The assistant conversation, kept in memory for the browser tab so it survives moving between
 * pages (each page renders its own navigation). Never persisted: it holds private data.
 */
export const useAssistantStore = create<AssistantState & AssistantActions>()((set, get) => ({
  ...INITIAL,
  session: 0,
  setOpen: (open) => set({ open }),
  setQuestion: (question) => set({ question }),
  reset: () => set({ ...INITIAL, session: get().session + 1 }),
  send: async (ask) => {
    const { question, history, pending, session } = get();
    const text = question.trim();
    if (!text || pending) return;
    const isCurrent = () => get().session === session;
    const conversation: ChatTurn[] = [...history, { role: "user", content: text }];
    set({
      history: [...conversation, { role: "assistant", content: "" }],
      question: "",
      pending: true,
      notice: null,
    });
    let answer = "";
    const result = await ask(conversation, (delta) => {
      answer += delta;
      if (isCurrent()) set({ history: [...conversation, { role: "assistant", content: answer }] });
    });
    if (!isCurrent()) return;
    if (result.kind === "done") {
      set({
        history: [...conversation, { role: "assistant", content: answer || "(no answer)" }],
        pending: false,
        notice: result.status === "ok" ? null : { kind: result.status },
      });
    } else {
      // Put the question back so it can be retried.
      set({ history, question: text, pending: false, notice: result });
    }
  },
}));

export const resetAssistant = () => useAssistantStore.getState().reset();

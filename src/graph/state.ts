import type { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => []
  }),
  userQuery: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => ""
  }),
  generatedOutput: Annotation<string>({
    reducer: (_current, update) => update,
    default: () => ""
  }),
  error: Annotation<string | undefined>({
    reducer: (_current, update) => update,
    default: () => undefined
  })
});

export type AgentState = typeof AgentStateAnnotation.State;
export type AgentStateUpdate = typeof AgentStateAnnotation.Update;
